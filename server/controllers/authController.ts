import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { emailService } from '../emailService';
import fs from 'fs';

class AuthController {
  // Хранилище временных кодов подтверждения (в продакшене лучше использовать Redis)
  private emailVerificationCodes = new Map<string, { code: string, expires: number }>();

  // Функция для чтения секретов из файлов
  private readSecret(secretPath: string): string {
    try {
      return fs.readFileSync(secretPath, 'utf8').trim();
    } catch (error) {
      console.error(`Failed to read secret from ${secretPath}:`, error);
      return '';
    }
  }

  // Получение JWT секрета
  private getJwtSecret(): string {
    return (() => {
          try {
            return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
          } catch (error) {
            console.error('Failed to read JWT secret:', error);
            return process.env.JWT_SECRET || 'secret';
          }
        })();
  }

  // Генерация случайного кода
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Отправка кода подтверждения через SMTP сервер
  private async sendVerificationEmail(email: string, code: string): Promise<void> {
    try {
      await emailService.sendVerificationEmail(email, code);
    } catch (error) {
      console.error('❌ Ошибка в sendVerificationEmail:', error);
      // Не выбрасываем ошибку, чтобы сервер не крашился
    }
  }

  async checkEmailExists(req: any, res: any) {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Проверяем, существует ли пользователь с таким email
    console.log('🔍 Database name:', db.databaseName);
    console.log('🔍 Collections:', await db.listCollections().toArray());
    
    const existingUser = await db.collection('users').findOne({ email });
    console.log('🔍 User exists check:', { email, exists: !!existingUser, user: existingUser });
    
    res.json({ 
      exists: !!existingUser,
      message: existingUser ? 'Пользователь с такой почтой уже существует' : 'Email свободен'
    });
  }

  async sendVerificationCode(req: any, res: any) {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Генерируем код подтверждения
    const code = authController.generateVerificationCode();
    const expires = Date.now() + 10 * 60 * 1000; // 10 минут

    // Сохраняем код
    authController.emailVerificationCodes.set(email, { code, expires });

    try {
      // Отправляем код
      await authController.sendVerificationEmail(email, code);
      res.json({ message: 'Код подтверждения отправлен на ваш email' });
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      res.status(500).json({ error: 'Ошибка отправки кода подтверждения. Попробуйте позже.' });
    }
  }

  async register(req: any, res: any) {
    try {
      const { email, password, name, verificationCode } = req.body;
      const db = req.app.locals.db;
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }

      // Проверяем код подтверждения
      const storedData = authController.emailVerificationCodes.get(email);
      if (!storedData || storedData.code !== verificationCode || Date.now() > storedData.expires) {
        return res.status(400).json({ error: 'Неверный или устаревший код подтверждения' });
      }

      // Удаляем использованный код
      authController.emailVerificationCodes.delete(email);
      
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь с такой почтой уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userData: any = {
        email,
        password: hashedPassword,
        name: name || '', // Оставляем пустым, если имя не передано
        glukocoins: 0,
        rewards: ['pioneer'] // Выдаем награду Pioneer любому новому пользователю
      };
       
      const user = await db.collection('users').insertOne(userData);

      const jwtSecret = (() => {
        try {
          return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
        } catch (error) {
          console.error('Failed to read JWT secret:', error);
          return process.env.JWT_SECRET || 'secret';
        }
      })();
      const token = jwt.sign({ userId: user.insertedId }, jwtSecret, { expiresIn: '7d' });
      
      res.json({ 
        token, 
        userId: user.insertedId,
        isPioneer: true,
        pioneerNumber: 1
      });
    } catch (error) {
      console.error('❌ Ошибка в register:', error);
      res.status(500).json({ error: 'Ошибка регистрации' });
    }
  }

  async login(req: any, res: any) {
    try {
      const { email, password } = req.body;
      const db = req.app.locals.db;
      
      console.log('🔍 Login attempt - Full request body:', req.body);
      console.log('🔍 Login attempt - Email:', email, 'Password length:', password?.length);
      
      if (!db) {
        console.log('❌ Database not connected in login');
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      console.log('🔍 Database name in login:', db.databaseName);
      console.log('🔍 Collections in login:', await db.listCollections().toArray());
      
      const user = await db.collection('users').findOne({ email });
      console.log('🔍 User search result:', { email, found: !!user, user });
      
      if (!user) {
        console.log('❌ User not found in database');
        return res.status(400).json({ error: 'Пользователя с таким email не существует' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Неверные данные' });
      }

      const jwtSecret = (() => {
        try {
          return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
        } catch (error) {
          console.error('Failed to read JWT secret:', error);
          return process.env.JWT_SECRET || 'secret';
        }
      })();
      const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' });
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
        client_secret: (() => {
          try {
            return fs.readFileSync('/run/secrets/vk_secret', 'utf8').trim();
          } catch (error) {
            console.error('Failed to read VK secret:', error);
            return process.env.VK_CLIENT_SECRET || '';
          }
        })(),
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
    // Читаем секреты из файлов
    const yandexClientId = process.env.YANDEX_CLIENT_ID || '';
    const yandexClientSecret = (() => {
      try {
        return fs.readFileSync('/run/secrets/yandex_secret', 'utf8').trim();
      } catch (error) {
        console.error('Failed to read Yandex secret:', error);
        return process.env.YANDEX_CLIENT_SECRET || '';
      }
    })();
    
    console.log('🔍 Environment variables:', { 
      YANDEX_CLIENT_ID: yandexClientId ? 'SET' : 'NOT SET',
      YANDEX_CLIENT_SECRET: yandexClientSecret ? 'SET' : 'NOT SET'
    });
      
    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: yandexClientId,
        client_secret: yandexClientSecret,
        redirect_uri: redirectUri
      })
    });
    
    const data = await response.json();
    console.log('🔍 Yandex OAuth response:', data);
    
    if (data.error) {
      console.error('❌ Yandex OAuth error:', data);
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
      
      // VK может не предоставить email, используем ID для идентификации
      const vkId = userData.id;
      
      // Ищем пользователя по VK ID или email (если есть)
      let user = await db.collection('users').findOne({
        $or: [
          { vkId: vkId },
          { email: userData.email }
        ]
      });

      if (!user) {
        // Автоматически регистрируем пользователя, если его нет в базе
        const result = await db.collection('users').insertOne({
          name: userData.first_name + ' ' + userData.last_name,
          username: `vk_${vkId}`, // Создаем уникальное имя пользователя для VK
          email: userData.email || `vk_${vkId}@vk.local`, // Если email нет, создаем временный
          vkId: vkId,
          glukocoins: 0,
          rewards: ['pioneer'] // Выдаем награду Pioneer любому новому пользователю
        });

        user = await db.collection('users').findOne({ _id: result.insertedId });
        
        // Перенаправляем на награду для нового пользователя
        res.json({ token: jwt.sign({ userId: user._id }, (() => {
          try {
            return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
          } catch (error) {
            console.error('Failed to read JWT secret:', error);
            return process.env.JWT_SECRET || 'secret';
          }
        })(), { expiresIn: '7d' }), user, isNewUser: true });
        return;
      }

      const token = jwt.sign({ userId: user._id }, (() => {
          try {
            return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
          } catch (error) {
            console.error('Failed to read JWT secret:', error);
            return process.env.JWT_SECRET || 'secret';
          }
        })(), { expiresIn: '7d' });
      
      res.json({ token, user });
    } catch (error) {
      console.error('❌ Ошибка в handleVKCallback:', error);
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
    try {const { code, state } = req.query;
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
            username: userData.email.split('@')[0], // Используем часть email как username
            glukocoins: 0,
            rewards: ['pioneer'] // Выдаем награду Pioneer любому новому пользователю
          });

          user = await db.collection('users').findOne({ _id: result.insertedId });
          
          // Перенаправляем на награду для нового пользователя
          const token = jwt.sign({ userId: user._id }, (() => {
          try {
            return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
          } catch (error) {
            console.error('Failed to read JWT secret:', error);
            return process.env.JWT_SECRET || 'secret';
          }
        })(), { expiresIn: '7d' });
          const origin = req.headers.origin || 'https://gluko-city.ru.tuna.am';
          
          res.send(`
            <html>
              <body>
                <script>
                  window.opener.postMessage({
                    type: 'social_auth_success',
                    token: '${token}',
                    user: ${JSON.stringify(user)},
                    isNewUser: true
                  }, '${origin}');
                  window.close();
                </script>
              </body>
            </html>
          `);
          return;
        }

        const token = jwt.sign({ userId: user._id }, (() => {
          try {
            return fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
          } catch (error) {
            console.error('Failed to read JWT secret:', error);
            return process.env.JWT_SECRET || 'secret';
          }
        })(), { expiresIn: '7d' });
        
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
      console.error('❌ OAuth callback error:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
}

export const authController = new AuthController();
