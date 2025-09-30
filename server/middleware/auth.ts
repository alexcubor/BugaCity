import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';

interface AuthRequest extends Request {
  user?: any;
}

// Функция для чтения секретов из файлов
const readSecret = (secretPath: string): string => {
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    console.error(`Failed to read secret from ${secretPath}:`, error);
    return '';
  }
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const jwtSecret = readSecret('/run/secrets/jwt_secret') || process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET не настроен' });
    }
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Загружаем полную информацию о пользователе из базы данных
    const db = req.app.locals.db;
    if (db) {
      const user = await db.collection('users').findOne({ _id: decoded.userId });
      if (user) {
        req.user = {
          userId: user._id,
          email: user.email,
          role: user.role || 'user' // По умолчанию роль 'user'
        };
      } else {
        return res.status(403).json({ error: 'Пользователь не найден' });
      }
    } else {
      // Fallback если база данных недоступна
      req.user = {
        userId: decoded.userId,
        role: 'user'
      };
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};
