import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// GET /api/awards - получить все награды
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const awards = await db.collection('awards').find({}).toArray();

    const formattedAwards = awards.map((award: any) => ({
      id: award.name, // Используем название как ID
      name: award.translations.ru.label,
      description: award.translations.ru.description,
      price: award.price
    }));

    res.json(formattedAwards);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении наград' });
  }
});

// GET /api/awards/:id - получить конкретную награду
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const award = await db.collection('awards').findOne({ name: id });
    
    if (!award) {
      return res.status(404).json({ error: 'Награда не найдена' });
    }

    const formattedAward = {
      id: award.name,
      name: award.translations.ru.label,
      description: award.translations.ru.description,
      price: award.price
    };

    res.json(formattedAward);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении награды' });
  }
});

export default router;
