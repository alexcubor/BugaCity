import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class AuthController {
  async register(req: any, res: any) {
    try {
      const { username, password, name, email } = req.body;
      const db = req.app.locals.db;
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      const existingUser = await db.collection('users').findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }

      // Проверяем количество пользователей с наградой Pioneer
      const pioneerCount = await db.collection('users').countDocuments({
        rewards: { $in: ['pioneer'] }
      });
       
      const hashedPassword = await bcrypt.hash(password, 12);
      const userData: any = {
        username,
        password: hashedPassword,
        name,
        email: email || `${username}@example.com`, // Generate email if not provided
        glukocoins: 0,
        rewards: []
      };
       
      // Добавляем награду Pioneer, если лимит не превышен (лимит 2)
      if (pioneerCount < 2) {
        userData.rewards.push('pioneer');
      }
       
      const user = await db.collection('users').insertOne(userData);

      const token = jwt.sign({ userId: user.insertedId }, 'secret', { expiresIn: '7d' });
      
      res.json({ 
        token, 
        userId: user.insertedId,
        isPioneer: pioneerCount < 2,
        pioneerNumber: pioneerCount < 2 ? pioneerCount + 1 : null
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Ошибка регистрации', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async login(req: any, res: any) {
    try {
      const { username, password } = req.body;
      const db = req.app.locals.db;
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      const user = await db.collection('users').findOne({ username });
      if (!user) {
        return res.status(400).json({ error: 'Неверные данные' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Неверные данные' });
      }

      const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '7d' });
      res.json({ token, userId: user._id });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Ошибка входа' });
    }
  }
}

export const authController = new AuthController();
