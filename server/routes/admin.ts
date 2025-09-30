import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = express.Router();

// Все админские endpoints требуют авторизации
router.use(authenticateToken);

// ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ =====

// Получить всех пользователей (только админы)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const users = await db.collection('users').find({}).toArray();
    res.json({ 
      users: users.map((user: any) => ({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        glukocoins: user.glukocoins,
        rewards: user.rewards,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

// Добавить награды пользователю (только админы)
router.post('/users/:email/add-rewards', requireAdmin, async (req, res) => {
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

// Удалить пользователя (только админы)
router.delete('/users/:email', requireAdmin, async (req, res) => {
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

// Изменить роль пользователя (только админы)
router.post('/users/:email/role', requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { email } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    const result = await db.collection('users').updateOne(
      { email },
      { $set: { role } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ 
      message: `Роль пользователя ${email} изменена на ${role}`,
      role 
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при изменении роли' });
  }
});

// ===== СИСТЕМНАЯ ИНФОРМАЦИЯ =====

// Получить статистику системы (только админы)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const userCount = await db.collection('users').countDocuments();
    const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
    const rewardCount = await db.collection('rewards').countDocuments();
    
    res.json({
      users: {
        total: userCount,
        admins: adminCount,
        regular: userCount - adminCount
      },
      rewards: {
        total: rewardCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

export default router;
