import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class AuthController {
  async register(req: any, res: any) {
    try {
      const { email, password, name } = req.body;
      const db = req.app.locals.db;
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь с такой почтой уже существует' });
      }

      // Проверяем количество пользователей с наградой Pioneer
      const pioneerCount = await db.collection('users').countDocuments({
        rewards: { $in: ['pioneer'] }
      });
       
      const hashedPassword = await bcrypt.hash(password, 12);
      const userData: any = {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0], // Используем часть email как имя по умолчанию
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
      res.status(500).json({ error: 'Ошибка регистрации' });
    }
  }

  async login(req: any, res: any) {
    try {
      const { email, password } = req.body;
      const db = req.app.locals.db;
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      const user = await db.collection('users').findOne({ email });
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
      res.status(500).json({ error: 'Ошибка входа' });
    }
  }

  private async exchangeVKCode(code: string, host?: string) {
    // Обмен кода на токен ВКонтакте
    const redirectUri = host?.includes('localhost') || host?.includes('tuna.am')
      ? 'https://gluko-city.ru.tuna.am/api/auth/callback'
      : 'https://gluko.city/api/auth/callback';
      
    const response = await fetch('https://oauth.vk.com/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VK_CLIENT_ID || '',
        client_secret: process.env.VK_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        code: code
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`VK OAuth error: ${data.error_description || data.error}`);
    }
    
    // Получаем информацию о пользователе
    const userResponse = await fetch(`https://api.vk.com/method/users.get?user_ids=${data.user_id}&fields=email&access_token=${data.access_token}&v=5.131`);
    const userData = await userResponse.json();
    
    return {
      id: data.user_id,
      name: `${userData.response[0].first_name} ${userData.response[0].last_name}`,
      email: data.email
    };
  }

  async exchangeYandexCode(code: string, host?: string) {
    // Обмен кода на токен Яндекса
    const redirectUri = host?.includes('localhost') || host?.includes('tuna.am')
      ? 'https://gluko-city.ru.tuna.am/api/auth/callback'
      : 'https://gluko.city/api/auth/callback';
      
    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.YANDEX_CLIENT_ID || '',
        client_secret: process.env.YANDEX_CLIENT_SECRET || '',
        redirect_uri: redirectUri
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Yandex OAuth error: ${data.error_description || data.error}`);
    }
    
    // Получаем информацию о пользователе
    const userResponse = await fetch('https://login.yandex.ru/info', {
      headers: { 'Authorization': `OAuth ${data.access_token}` }
    });
    const userData = await userResponse.json();
    
    return {
      id: userData.id,
      name: userData.real_name || userData.display_name || userData.login,
      email: userData.default_email,
      login: userData.login
    };
  }

  async handleVKCallback(req: any, res: any) {
    try {
      const { accessToken, userData, action } = req.body;

      const db = req.app.locals.db;
      
      // Ищем пользователя только по email
      let user = await db.collection('users').findOne({
        email: userData.email
      });

      if (!user) {
        // Автоматически регистрируем пользователя, если его нет в базе
        const result = await db.collection('users').insertOne({
          name: userData.first_name + ' ' + userData.last_name,
          email: userData.email,
          glukocoins: 0,
          rewards: []
        });

        user = await db.collection('users').findOne({ _id: result.insertedId });
      }

      const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '7d' });
      
      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  async getVKUser(req: any, res: any) {
    try {
      const { accessToken, userId } = req.query;
      const response = await fetch(`https://api.vk.com/method/users.get?user_ids=${userId}&fields=email&access_token=${accessToken}&v=5.131`);
      const data = await response.json();
      res.json(data.response[0]);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  async handleOAuthCallback(req: any, res: any) {
    try {
      const { code, state } = req.query;
      const [provider, action] = state.split('_'); // yandex_login или yandex_register
      
      if (provider === 'yandex') {
        const userData = await authController.exchangeYandexCode(code, req.headers.host);
        
        const db = req.app.locals.db;
        if (!db) {
          throw new Error('Database connection failed');
        }
        
        // Ищем пользователя только по email
        let user = await db.collection('users').findOne({
          email: userData.email
        });

        if (!user) {
          // Автоматически регистрируем пользователя
          const result = await db.collection('users').insertOne({
            name: userData.name,
            email: userData.email,
            glukocoins: 0,
            rewards: []
          });

          user = await db.collection('users').findOne({ _id: result.insertedId });
        }

        const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '7d' });
        
        // Возвращаем HTML страницу, которая отправит сообщение в родительское окно
        const origin = req.headers.origin || 'https://gluko-city.ru.tuna.am';
        
        res.send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'social_auth_success',
                  token: '${token}',
                  user: ${JSON.stringify(user)}
                }, '${origin}');
                window.close();
              </script>
            </body>
          </html>
        `);
      } else {
        res.status(400).json({ error: 'Неизвестный провайдер' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
}

export const authController = new AuthController();
