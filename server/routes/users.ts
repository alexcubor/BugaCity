import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth';
import { requireOwnership } from '../middleware/roles';

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

// Удалить свой аккаунт
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const userId = (req as any).user?.userId;
    const result = await db.collection('users').deleteOne({ _id: userId });
    
    if (result.deletedCount > 0) {
      res.json({ message: 'Ваш аккаунт удален' });
    } else {
      res.status(404).json({ error: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении аккаунта' });
  }
});

export default router;
