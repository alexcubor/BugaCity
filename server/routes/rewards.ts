import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// GET /api/rewards - получить все награды
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const rewards = await db.collection('rewards').find({}).toArray();
    console.log('🔍 Найденные награды в БД:', rewards);

    const formattedRewards = rewards.map((reward: any) => ({
      id: reward.name || reward._id?.toString(),
      name: reward?.translations?.ru?.label || reward?.name || 'Без названия',
      description: reward?.translations?.ru?.description || '',
      price: reward?.price ?? 0
    }));

    res.json(formattedRewards);
  } catch (error) {
    console.error('Awards list error:', error);
    res.status(500).json({ error: 'Ошибка при получении наград' });
  }
});

// GET /api/rewards/:id - получить конкретную награду
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const { id } = req.params;
    
    const reward = await db.collection('rewards').findOne({ $or: [{ name: id }, { _id: id }] });
    
    if (!reward) {
      return res.status(404).json({ error: 'Награда не найдена' });
    }

    const formattedReward = {
      id: reward.name || reward._id?.toString(),
      name: reward?.translations?.ru?.label || reward?.name || 'Без названия',
      description: reward?.translations?.ru?.description || 'Нет описания',
      price: reward?.price ?? 0
    };

    res.json(formattedReward);
  } catch (error) {
    console.error('Award details error:', error);
    res.status(500).json({ error: 'Ошибка при получении награды' });
  }
});

export default router;
