import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// GET /api/awards - получить все награды
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const awards = await db.collection('awards').find({}).toArray();

    const formattedAwards = awards.map((award: any) => ({
      id: award.name || award._id?.toString(),
      name: award?.translations?.ru?.label || award?.name || 'Без названия',
      description: award?.translations?.ru?.description || '',
      price: award?.price ?? 0
    }));

    res.json(formattedAwards);
  } catch (error) {
    console.error('Awards list error:', error);
    res.status(500).json({ error: 'Ошибка при получении наград' });
  }
});

// GET /api/awards/:id - получить конкретную награду
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const { id } = req.params;
    
    const award = await db.collection('awards').findOne({ $or: [{ name: id }, { _id: id }] });
    
    if (!award) {
      return res.status(404).json({ error: 'Награда не найдена' });
    }

    const formattedAward = {
      id: award.name || award._id?.toString(),
      name: award?.translations?.ru?.label || award?.name || 'Без названия',
      description: award?.translations?.ru?.description || 'Нет описания',
      price: award?.price ?? 0
    };

    res.json(formattedAward);
  } catch (error) {
    console.error('Award details error:', error);
    res.status(500).json({ error: 'Ошибка при получении награды' });
  }
});

export default router;
