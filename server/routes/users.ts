import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';
import { requireOwnership } from '../middleware/roles';
import { deleteUserAndData } from '../utils/userDeletion';

const router = express.Router();

// Получить информацию о текущем пользователе
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      glukocoins: user.glukocoins,
      rewards: user.rewards || [],
      avatar: user._id ? `users/${user._id.substring(0, 8).padStart(8, '0')}/${user._id}/avatar.jpg` : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { userId } = req.params;
    
    let user;
    if (ObjectId.isValid(userId)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } else if (/^\d{12}$/.test(userId)) {
      user = await db.collection('users').findOne({ _id: userId });
    } else {
      user = await db.collection('users').findOne({ email: userId });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      glukocoins: user.glukocoins,
      rewards: user.rewards || [],
      avatar: user._id ? `users/${user._id.substring(0, 8).padStart(8, '0')}/${user._id}/avatar.jpg` : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

// Обновить свое имя
router.post('/me/update-name', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { name } = req.body;
    const userId = (req as any).user?.userId;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Имя не может быть пустым' });
    }

    const updateResult = await db.collection('users').updateOne(
      { _id: userId },
      { $set: { name: name.trim() } }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ 
      message: 'Имя пользователя обновлено',
      name: name.trim()
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

// Обновить местоположение
router.post('/me/location', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { coordinates, accuracy, isActive } = req.body;
    const userId = (req as any).user?.userId;
    
    // Валидация координат
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      console.warn('⚠️ Некорректные координаты', { coordinates, userId });
      return res.status(400).json({ error: 'Неверные координаты' });
    }

    const [longitude, latitude] = coordinates;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      console.warn('⚠️ Координаты вне допустимого диапазона', { longitude, latitude, userId });
      return res.status(400).json({ error: 'Координаты вне допустимого диапазона' });
    }

    const locationData = {
      coordinates: [longitude, latitude],
      accuracy: accuracy || 0,
      lastUpdated: new Date().toISOString(),
      isActive: isActive !== undefined ? isActive : true
    };

    const updateResult = await db.collection('users').updateOne(
      { _id: userId },
      { $set: { location: locationData } }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ 
      message: 'Местоположение обновлено',
      location: locationData
    });
  } catch (error: any) {
    console.error('❌ Location update error', { error: error.message, userId: (req as any).user?.userId });
    res.status(500).json({ error: 'Ошибка при обновлении местоположения' });
  }
});

// Обновить онлайн-статус (heartbeat), по возможности с координатами
router.post('/me/heartbeat', authenticateToken, async (req: any, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;
    const { coordinates, accuracy } = req.body || {};

    let updateResult;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const [longitude, latitude] = coordinates;
      updateResult = await db.collection('users').updateOne(
        { _id: userId },
        {
          $set: {
            'location.coordinates': [longitude, latitude],
            'location.accuracy': accuracy || 0,
            'location.isActive': true,
            'location.lastUpdated': new Date().toISOString()
          }
        }
      );
    } else {
      // Без координат — только isActive/lastUpdated
      updateResult = await db.collection('users').updateOne(
        { _id: userId },
        {
          $set: {
            'location.isActive': true,
            'location.lastUpdated': new Date().toISOString()
          }
        }
      );
    }

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ message: 'Онлайн-статус обновлён' });
  } catch (error: any) {
    console.error('❌ Heartbeat error', { error: error.message, userId: (req as any).user?.userId });
    res.status(500).json({ error: 'Ошибка при обновлении онлайн-статуса' });
  }
});

// Получить друзей на карте (только друзья с геолокацией)
router.get('/friends/location', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;
    
    // Получаем друзей с геолокацией через агрегацию
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
      
      // Присоединяем пользователей с геолокацией
      {
        $lookup: {
          from: 'users',
          localField: 'friendId',
          foreignField: '_id',
          as: 'friendData'
        }
      },
      
      { $unwind: '$friendData' },
      
      // Фильтруем только тех, кто делится геолокацией
      {
        $match: {
          'friendData.location.isActive': true
        }
      },
      
      // Возвращаем только нужные поля для карты
      {
        $project: {
          id: '$friendData._id',
          name: '$friendData.name',
          coordinates: '$friendData.location.coordinates',
          accuracy: '$friendData.location.accuracy',
          lastUpdated: '$friendData.location.lastUpdated'
        }
      }
    ]).toArray();

    res.json(friends);
  } catch (error: any) {
    console.error('❌ Friends location error', { error: error.message, userId: (req as any).user?.userId });
    res.status(500).json({ error: 'Ошибка при получении друзей' });
  }
});

// Получить свое местоположение
router.get('/me/location', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      location: user.location || null
    });
  } catch (error: any) {
    console.error('❌ Get location error', { error: error.message, userId: (req as any).user?.userId });
    res.status(500).json({ error: 'Ошибка при получении местоположения' });
  }
});

// Удалить свой аккаунт
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Email пользователя не найден' });
    }

    // Используем общую функцию удаления
    const result = await deleteUserAndData(db, userEmail);
    
    if (result.success) {
      res.json({ message: 'Ваш аккаунт и все данные удалены' });
    } else {
      res.status(404).json({ error: result.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении аккаунта' });
  }
});

export default router;
