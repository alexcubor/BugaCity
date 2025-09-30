import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email?: string;
        role?: string;
      };
    }
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Недостаточно прав. Требуются права администратора.' 
    });
  }

  next();
};

export const requireOwnership = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const targetUserId = req.params.userId || req.params.email;
  const currentUserId = req.user.userId;
  const currentUserEmail = req.user.email;

  if (req.user.role === 'admin') {
    return next();
  }

  if (targetUserId !== currentUserId && targetUserId !== currentUserEmail) {
    return res.status(403).json({ 
      error: 'Недостаточно прав. Вы можете работать только со своими данными.' 
    });
  }

  next();
};
