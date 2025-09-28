import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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

router.post('/:userId/update-name', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { userId } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Имя не может быть пустым' });
    }

    let updateResult;
    if (ObjectId.isValid(userId)) {
      updateResult = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { name: name.trim() } }
      );
    } else if (/^\d{12}$/.test(userId)) {
      updateResult = await db.collection('users').updateOne(
        { _id: userId },
        { $set: { name: name.trim() } }
      );
    } else {
      updateResult = await db.collection('users').updateOne(
        { email: userId },
        { $set: { name: name.trim() } }
      );
    }
    
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

router.delete('/:email', async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { email } = req.params;
    const result = await db.collection('users').deleteOne({ email });
    
    if (result.deletedCount > 0) {
      res.json({ message: `Пользователь ${email} удален` });
    } else {
      res.status(404).json({ error: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении пользователя' });
  }
});

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
