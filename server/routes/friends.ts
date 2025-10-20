import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Кэш для друзей
const friendsCache = new Map<string, { friends: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Отправить запрос в друзья
router.post('/request', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { addresseeId } = req.body;
    const requesterId = (req as any).user?.userId;

    if (!addresseeId) {
      return res.status(400).json({ error: 'ID получателя обязателен' });
    }

    if (requesterId === addresseeId) {
      return res.status(400).json({ error: 'Нельзя добавить себя в друзья' });
    }

    // Проверяем, не существует ли уже дружба
    const existingFriendship = await db.collection('friendships').findOne({
      $or: [
        { requester: requesterId, addressee: addresseeId },
        { requester: addresseeId, addressee: requesterId }
      ]
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Дружба уже существует' });
    }

    // Создаем запрос в друзья
    const friendship = {
      requester: requesterId,
      addressee: addresseeId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('friendships').insertOne(friendship);

    // Очищаем кэш для обоих пользователей
    friendsCache.delete(requesterId);
    friendsCache.delete(addresseeId);

    res.json({ message: 'Запрос в друзья отправлен' });
  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка при отправке запроса' });
  }
});

// Принять/отклонить запрос
router.put('/request/:requestId', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { requestId } = req.params;
    const { status } = req.body; // 'accepted' или 'declined'
    const userId = (req as any).user?.userId;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    // Находим запрос
    const friendship = await db.collection('friendships').findOne({
      _id: new ObjectId(requestId),
      addressee: userId,
      status: 'pending'
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Запрос не найден' });
    }

    // Обновляем статус
    await db.collection('friendships').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    // Очищаем кэш для обоих пользователей
    friendsCache.delete(userId);
    friendsCache.delete(friendship.requester.toString());

    res.json({ message: `Запрос ${status === 'accepted' ? 'принят' : 'отклонен'}` });
  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка при обработке запроса' });
  }
});

// Получить список друзей (с кэшированием)
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;
    const force = (req.query.force as string) === 'true';

    // Проверяем кэш
    const cacheKey = `${userId}_${page}_${limit}`;
    const cached = friendsCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        friends: cached.friends,
        pagination: {
          page,
          limit,
          hasMore: cached.friends.length === limit
        }
      });
    }

    // Получаем друзей из БД с агрегацией (быстро!)
    const friends = await db.collection('friendships').aggregate([
      // Находим все дружбы пользователя
      {
        $match: {
          $or: [
            { requester: userId },
            { addressee: userId }
          ],
          status: 'accepted'
        }
      },
      
      // Определяем кто друг
      {
        $addFields: {
          friendId: {
            $cond: {
              if: { $eq: ['$requester', userId] },
              then: '$addressee',
              else: '$requester'
            }
          }
        }
      },
      
      // Присоединяем данные пользователей
      {
        $lookup: {
          from: 'users',
          localField: 'friendId',
          foreignField: '_id',
          as: 'friendData'
        }
      },
      
      { $unwind: '$friendData' },
      
      // Возвращаем только нужные поля
      {
        $project: {
          id: '$friendData._id',
          name: '$friendData.name',
          email: '$friendData.email',
          avatar: '$friendData.avatar',
          location: '$friendData.location',
          friendshipDate: '$createdAt'
        }
      },
      
      // Сортируем по дате дружбы
      { $sort: { friendshipDate: -1 } },
      
      // Пагинация
      { $skip: skip },
      { $limit: limit }
    ]).toArray();

    // Сохраняем в кэш
    friendsCache.set(cacheKey, {
      friends,
      timestamp: Date.now()
    });

    res.json({
      friends,
      pagination: {
        page,
        limit,
        hasMore: friends.length === limit
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка при получении друзей' });
  }
});

// Получить входящие запросы
router.get('/requests/incoming', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;

    const requests = await db.collection('friendships').aggregate([
      {
        $match: {
          addressee: userId,
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'requester',
          foreignField: '_id',
          as: 'requesterData'
        }
      },
      { $unwind: '$requesterData' },
      {
        $project: {
          _id: 1,
          requester: {
            _id: '$requesterData._id',
            name: '$requesterData.name',
            email: '$requesterData.email',
            avatar: '$requesterData.avatar'
          },
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка при получении запросов' });
  }
});

// Получить исходящие запросы
router.get('/requests/outgoing', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;

    const requests = await db.collection('friendships').aggregate([
      {
        $match: {
          requester: userId,
          status: 'pending'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'addressee',
          foreignField: '_id',
          as: 'addresseeData'
        }
      },
      { $unwind: '$addresseeData' },
      {
        $project: {
          _id: 1,
          addressee: {
            _id: '$addresseeData._id',
            name: '$addresseeData.name',
            email: '$addresseeData.email',
            avatar: '$addresseeData.avatar'
          },
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]).toArray();

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка при получении запросов' });
  }
});

// Удалить из друзей
router.delete('/:friendId', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { friendId } = req.params;
    const userId = (req as any).user?.userId;

    // Удаляем дружбу в обе стороны
    const result = await db.collection('friendships').deleteOne({
      $or: [
        { requester: userId, addressee: friendId },
        { requester: friendId, addressee: userId }
      ],
      status: 'accepted'
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Дружба не найдена' });
    }

    // Очищаем кэш для обоих пользователей
    friendsCache.delete(userId);
    friendsCache.delete(friendId);

    res.json({ message: 'Дружба удалена' });
  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка при удалении дружбы' });
  }
});

export default router;
