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

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const jwtSecret = readSecret('/run/secrets/jwt_secret') || process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};
