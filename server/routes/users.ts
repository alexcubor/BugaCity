import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Список пользователей
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const users = await db.collection('users').find({}).toArray();
    res.json({ users: users.map((user: any) => ({
      id: user._id,
      email: user.email,
      name: user.name,
      glukocoins: user.glukocoins,
      rewards: user.rewards
    })) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

// Получить данные конкретного пользователя
router.get('/:userId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { userId } = req.params;
    
    // Проверяем, является ли userId ObjectId или email
    let user;
    if (ObjectId.isValid(userId)) {
      // ObjectId формат
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } else {
      // Email формат
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
      rewards: user.rewards || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

// Обновить данные пользователя
router.post('/:userId/update-name', async (req, res) => {
  console.log('PUT /:userId вызван с параметрами:', req.params);
  console.log('Тело запроса:', req.body);
  
  try {
    const db = req.app.locals.db;
    if (!db) {
      console.error('Database not connected');
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { userId } = req.params;
    const { name } = req.body;
    
    console.log('userId:', userId);
    console.log('name:', name);
    
    if (!name || name.trim() === '') {
      console.error('Имя пустое');
      return res.status(400).json({ error: 'Имя не может быть пустым' });
    }

    // Проверяем, является ли userId ObjectId или email
    let updateResult;
    if (ObjectId.isValid(userId)) {
      console.log('Используем ObjectId формат');
      // ObjectId формат
      updateResult = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { name: name.trim() } }
      );
    } else {
      console.log('Используем email формат');
      // Email формат
      updateResult = await db.collection('users').updateOne(
        { email: userId },
        { $set: { name: name.trim() } }
      );
    }
    
    console.log('Результат обновления:', updateResult);
    
    if (updateResult.matchedCount === 0) {
      console.error('Пользователь не найден');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log('Имя успешно обновлено');
    res.json({ 
      message: 'Имя пользователя обновлено',
      name: name.trim()
    });
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

// Добавить награды пользователю
router.post('/:email/add-rewards', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { email } = req.params;
    const { rewards } = req.body;

    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Добавляем награды к существующим
    const updatedRewards = [...(user.rewards || []), ...rewards];

    await db.collection('users').updateOne(
      { email },
      { $set: { rewards: updatedRewards } }
    );

    res.json({ 
      message: 'Награды добавлены',
      rewards: updatedRewards
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при добавлении наград' });
  }
});

// Очистить базу данных (только для разработки)
router.post('/clear-db', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    await db.collection('users').deleteMany({});
    res.json({ message: 'База данных очищена' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка очистки' });
  }
});

export default router;
