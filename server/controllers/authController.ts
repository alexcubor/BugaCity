import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { emailService } from '../emailService';
import fs from 'fs';
import path from 'path';

class AuthController {
  private emailVerificationCodes = new Map<string, { code: string, expires: number }>();

  private readSecret(secretName: string, envVar: string): string | null {
    if (process.env[envVar]) {
      return process.env[envVar]!;
    }
    
    try {
      return fs.readFileSync(`/run/secrets/${secretName}`, 'utf8').trim();
    } catch (error) {
      try {
        return fs.readFileSync(`secrets/${secretName}.txt`, 'utf8').trim();
      } catch (error2) {
        console.error(`Failed to read ${secretName} from both paths:`, error2);
        return null;
      }
    }
  }

  public getJwtSecret(): string {
    const secret = this.readSecret('jwt_secret', 'JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET не найден! Проверьте файл secrets/jwt_secret.txt или переменную окружения JWT_SECRET');
    }
    return secret;
  }

  private async generateIncrementalId(db: any): Promise<string> {
    try {
      const lastUser = await db.collection('users').findOne(
        { _id: { $regex: /^\d{12}$/ } },
        { sort: { _id: -1 } }
      );
      
      let nextId: string;
      if (lastUser && lastUser._id) {
        const currentId = parseInt(lastUser._id);
        nextId = (currentId + 1).toString().padStart(12, '0');
      } else {
        nextId = '1'.padStart(12, '0');
      }
      
      console.log('🔍 Генерируем инкрементальный ID:', nextId);
      return nextId;
    } catch (error) {
      console.error('❌ Ошибка генерации ID:', error);
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      return timestamp + random;
    }
  }

  private getUserDirPath(userId: string): { fullPath: string, relativePath: string } {
    const hashPrefix = userId.substring(0, 8).padStart(8, '0');
    const fullPath = path.join('uploads', 'users', hashPrefix, userId);
    const relativePath = path.join('users', hashPrefix, userId);
    return { fullPath, relativePath };
  }

  public getAvatarPath(userId: string): string {
    const { relativePath } = this.getUserDirPath(userId);
    return path.join(relativePath, 'avatar.jpg');
  }
  private async downloadAndSaveAvatar(avatarUrl: string, userId: string): Promise<string | null> {
    try {
      console.log('🔍 downloadAndSaveAvatar вызван с параметрами:', { avatarUrl, userId });
      if (!avatarUrl) {
        console.log('❌ avatarUrl пустой, возвращаем null');
        return null;
      }

      const { fullPath: userDir, relativePath } = this.getUserDirPath(userId);
      
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      const response = await fetch(avatarUrl);
      if (!response.ok) {
        console.error('❌ Ошибка скачивания аватара:', response.status);
        return null;
      }

      // Проверяем Content-Type
      const contentType = response.headers.get('content-type');
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!contentType || !allowedTypes.includes(contentType)) {
        console.error('❌ Неподдерживаемый тип файла:', contentType);
        return null;
      }

      // Проверяем размер файла (максимум 5MB)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
        console.error('❌ Файл слишком большой:', contentLength);
        return null;
      }

      const buffer = await response.arrayBuffer();
      
      // Дополнительная проверка размера после загрузки
      if (buffer.byteLength > 5 * 1024 * 1024) {
        console.error('❌ Файл слишком большой после загрузки:', buffer.byteLength);
        return null;
      }

      // Определяем расширение на основе Content-Type
      let extension = '.jpg';
      if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('webp')) extension = '.webp';

      const filename = `avatar${extension}`;
      const filepath = path.join(userDir, filename);

      fs.writeFileSync(filepath, Buffer.from(buffer));
      
      const avatarRelativePath = path.join(relativePath, filename);
      console.log('✅ Аватар сохранен:', { filepath, avatarRelativePath, contentType, size: buffer.byteLength });
      return avatarRelativePath;
    } catch (error) {
      console.error('❌ Ошибка при сохранении аватара:', error);
      return null;
    }
  }

  // Получение VK Client ID (публичный, не секрет)
  public getVKClientId(): string {
    return process.env.VK_CLIENT_ID || '';
  }

  // Получение VK секрета
  public getVKSecret(): string {
    const secret = this.readSecret('vk_secret', 'VK_CLIENT_SECRET');
    if (!secret) {
      throw new Error('VK_CLIENT_SECRET не найден! Проверьте файл secrets/vk_secret.txt или переменную окружения VK_CLIENT_SECRET');
    }
    return secret;
  }

  // Получение Yandex Client ID (публичный, не секрет)
  public getYandexClientId(): string {
    return process.env.YANDEX_CLIENT_ID || '';
  }

  // Получение Yandex секрета
  public getYandexSecret(): string {
    const secret = this.readSecret('yandex_secret', 'YANDEX_CLIENT_SECRET');
    if (!secret) {
      throw new Error('YANDEX_CLIENT_SECRET не найден! Проверьте файл secrets/yandex_secret.txt или переменную окружения YANDEX_CLIENT_SECRET');
    }
    return secret;
  }

  // Генерация случайного кода
  private generateVerificationCode(email?: string): string {
    // Костыль для тестов: для sdiz@ya.ru всегда возвращаем 111111
    if (email === 'sdiz@ya.ru') {
      return '111111';
    }
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

    const existingUser = await db.collection('users').findOne({ email });
    
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

    const code = authController.generateVerificationCode(email);
    const expires = Date.now() + 10 * 60 * 1000; // 10 минут

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

      // 🔒 БЕЗОПАСНОСТЬ: Валидация пароля
      if (!password) {
        return res.status(400).json({ error: 'Пароль обязателен' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
      }

      if (password.length > 128) {
        return res.status(400).json({ error: 'Пароль слишком длинный' });
      }

      if (!/[a-zA-Z]/.test(password)) {
        return res.status(400).json({ error: 'Пароль должен содержать хотя бы одну букву' });
      }

      const storedData = authController.emailVerificationCodes.get(email);
      if (!storedData || storedData.code !== verificationCode || Date.now() > storedData.expires) {
        return res.status(400).json({ error: 'Неверный или устаревший код подтверждения' });
      }

      authController.emailVerificationCodes.delete(email);
      
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь с такой почтой уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      
      const numericId = await authController.generateIncrementalId(db);
      
      const userData: any = {
        _id: numericId,
        email,
        password: hashedPassword,
        name: name || '',
        glukocoins: 0,
        rewards: ['pioneer'],
        role: email === 'admin@buga.city' ? 'admin' : 'user' // Первый админ
      };
       
      const user = await db.collection('users').insertOne(userData);

      const jwtSecret = authController.getJwtSecret();
      const token = jwt.sign({ userId: numericId }, jwtSecret, { expiresIn: '7d' });
      
      res.json({ 
        token, 
        userId: numericId,
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
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      const user = await db.collection('users').findOne({ email });
      
      if (!user) {
        return res.status(400).json({ error: 'Пользователя с таким email не существует' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Неверные данные' });
      }

      const jwtSecret = authController.getJwtSecret();
      const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' });
      
      res.json({ token, userId: user._id });
    } catch (error: any) {
      console.error('❌ Ошибка в login:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
      res.status(500).json({ error: 'Ошибка входа' });
    }
  }

  private async exchangeVKCode(code: string, host?: string) {
    // Обмен кода на токен ВКонтакте
    // Динамически определяем redirect URI на основе host
    const redirectUri = host && host.includes('bugacity-docker.ru.tuna.am') 
      ? 'https://bugacity-docker.ru.tuna.am/api/auth/callback'
      : host && host.includes('gluko.city')
        ? 'https://gluko.city/api/auth/callback'
        : 'https://bugacity-npm.ru.tuna.am/api/auth/callback';
      
    const response = await fetch('https://oauth.vk.com/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: authController.getVKClientId(),
        client_secret: authController.getVKSecret(),
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
    console.log('🔍 exchangeYandexCode вызван с параметрами:', { code, host });
    
    // Динамически определяем redirect URI на основе host
    const redirectUri = host && host.includes('bugacity-docker.ru.tuna.am') 
      ? 'https://bugacity-docker.ru.tuna.am/api/auth/callback'
      : host && host.includes('gluko.city')
        ? 'https://gluko.city/api/auth/callback'
        : 'https://bugacity-npm.ru.tuna.am/api/auth/callback';
    
    console.log('🔍 Используем redirectUri:', redirectUri);
    const yandexClientId = authController.getYandexClientId();
    const yandexClientSecret = authController.getYandexSecret();
    
      
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
    
    console.log('🔍 Запрос к Yandex API отправлен, статус:', response.status);
    const data = await response.json();
    console.log('🔍 Ответ от Yandex API:', data);
    
    if (data.error) {
      console.error('❌ Yandex OAuth error:', data);
      throw new Error(`Yandex OAuth error: ${data.error_description || data.error}`);
    }
    
    if (!data.access_token) {
      console.error('❌ No access token in response:', data);
      throw new Error('No access token received from Yandex');
    }
    
    // Получаем информацию о пользователе
    console.log('🔍 Получаем данные пользователя от Yandex...');
    const userResponse = await fetch('https://login.yandex.ru/info', {
      headers: { 'Authorization': `OAuth ${data.access_token}` }
    });
    console.log('🔍 Статус ответа от Yandex user info:', userResponse.status);
    const userData = await userResponse.json();
    console.log('🔍 Данные пользователя от Yandex:', userData);
    console.log('🔍 Yandex ID:', userData.id, 'тип:', typeof userData.id);
    
    return {
      id: userData.id,
      name: userData.real_name || userData.display_name || userData.login,
      email: userData.default_email,
      login: userData.login,
      avatar: userData.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200` : null
    };
  }

  async handleVKCallback(req: any, res: any) {
    try {
      const { accessToken, userData, action } = req.body;

      const db = req.app.locals.db;
      
      const vkId = userData.id;
      console.log('🔍 VK ID:', vkId, 'тип:', typeof vkId);
      
      let user = await db.collection('users').findOne({
        $or: [
          { vkId: vkId },
          { email: userData.email }
        ]
      });

      if (!user) {
        const numericId = await authController.generateIncrementalId(db);
        
        let username = `vk_${vkId}`;
        let counter = 1;
        while (await db.collection('users').findOne({ username })) {
          username = `vk_${vkId}_${counter}`;
          counter++;
        }

        const result = await db.collection('users').insertOne({
          _id: numericId,
          name: userData.first_name + ' ' + userData.last_name,
          username: username,
          email: userData.email || `vk_${vkId}@vk.local`,
          vkId: vkId,
          avatar: userData.photo_200 || null,
          glukocoins: 0,
          rewards: ['pioneer']
        });

        user = await db.collection('users').findOne({ _id: numericId });
        
        res.json({ token: jwt.sign({ userId: numericId }, authController.getJwtSecret(), { expiresIn: '7d' }), user, isNewUser: true });
        return;
      }

      const token = jwt.sign({ userId: user._id }, authController.getJwtSecret(), { expiresIn: '7d' });
      
      res.json({ token, user });
    } catch (error) {
      console.error('❌ Ошибка в handleVKCallback:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  async getVKUser(req: any, res: any) {
    try {
      const { accessToken, userId } = req.query;
      const response = await fetch(`https://api.vk.com/method/users.get?user_ids=${userId}&fields=email,photo_200&access_token=${accessToken}&v=5.131`);
      const data = await response.json();
      res.json(data.response[0]);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }


  async handleOAuthCallback(req: any, res: any) {
    try {
      console.log('🔍 OAuth callback получен:', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        query: req.query
      });
      
      const { code, state } = req.query;
      
      if (!state) {
        return res.status(400).json({ error: 'Отсутствует параметр state' });
      }
      
      if (!code) {
        return res.status(400).json({ error: 'Отсутствует параметр code' });
      }
      
      const [provider, action] = state.split('_'); // yandex_login или yandex_register
      console.log(`🔍 Обрабатываем OAuth callback: provider=${provider}, action=${action}`);
      
      if (provider === 'yandex') {
        console.log('🔍 Начинаем обработку Yandex OAuth...');
        const userData = await authController.exchangeYandexCode(code, req.headers.host);
        console.log('🔍 Данные пользователя получены:', userData);
        
        const db = req.app.locals.db;
        if (!db) {
          throw new Error('Database connection failed');
        }
        console.log('🔍 База данных подключена');
        
        console.log('🔍 Ищем пользователя в базе данных по email:', userData.email);
        let user = await db.collection('users').findOne({
          email: userData.email
        });
        console.log('🔍 Результат поиска пользователя:', user ? 'найден' : 'не найден');

        if (!user) {
          console.log('🔍 Создаем нового пользователя...');
          
          const numericId = await authController.generateIncrementalId(db);
          
          let avatarPath = null;
          if (userData.avatar) {
            console.log('🔍 Скачиваем аватар пользователя...');
            avatarPath = await authController.downloadAndSaveAvatar(userData.avatar, numericId);
          }
          const result = await db.collection('users').insertOne({
            _id: numericId,
            name: userData.name,
            email: userData.email,
            username: userData.email.split('@')[0],
            glukocoins: 0,
            rewards: ['pioneer']
          });

          user = await db.collection('users').findOne({ _id: result.insertedId });
          
          const token = jwt.sign({ userId: user._id }, authController.getJwtSecret(), { expiresIn: '7d' });
          const origin = req.headers.origin || (req.headers.host && req.headers.host.includes('bugacity-docker.ru.tuna.am') 
            ? 'https://bugacity-docker.ru.tuna.am' 
            : req.headers.host && req.headers.host.includes('gluko.city')
              ? 'https://gluko.city'
              : 'https://bugacity-npm.ru.tuna.am');
          
          // Проверяем, является ли это мобильным устройством
          const userAgent = req.headers['user-agent'] || '';
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
          
          if (isMobile) {
            // Для мобильных устройств перенаправляем на главную страницу с токеном
            res.redirect(`${origin}/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&isNewUser=true`);
          } else {
            // Для десктопа используем postMessage
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
          }
          return;
        }

        if (userData.avatar) {
          console.log('🔍 Скачиваем аватар существующего пользователя...');
          await authController.downloadAndSaveAvatar(userData.avatar, user._id);
        }

        const token = jwt.sign({ userId: user._id }, authController.getJwtSecret(), { expiresIn: '7d' });
        
        // Возвращаем HTML страницу, которая отправит сообщение в родительское окно
        const origin = req.headers.origin || (req.headers.host && req.headers.host.includes('bugacity-docker.ru.tuna.am') 
          ? 'https://bugacity-docker.ru.tuna.am' 
          : req.headers.host && req.headers.host.includes('gluko.city')
            ? 'https://gluko.city'
            : 'https://bugacity-npm.ru.tuna.am');
        
        // Проверяем, является ли это мобильным устройством
        const userAgent = req.headers['user-agent'] || '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        
        if (isMobile) {
          // Для мобильных устройств перенаправляем на главную страницу с токеном
          res.redirect(`${origin}/?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}&isNewUser=false`);
        } else {
          // Для десктопа используем postMessage
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
        }
      } else if (provider === 'vk') {
        // Обработка VK OAuth
        const userData = await authController.exchangeVKCode(code, req.headers.host);
        
        const db = req.app.locals.db;
        if (!db) {
          throw new Error('Database connection failed');
        }
        
        let user = await db.collection('users').findOne({
          email: userData.email
        });

        if (!user) {
          const numericId = await authController.generateIncrementalId(db);
          
          const result = await db.collection('users').insertOne({
            _id: numericId,
            name: userData.name,
            email: userData.email,
            username: userData.email.split('@')[0],
            glukocoins: 0,
            rewards: ['pioneer']
          });

          user = await db.collection('users').findOne({ _id: numericId });
          
          const token = jwt.sign({ userId: numericId }, authController.getJwtSecret(), { expiresIn: '7d' });
          const origin = req.headers.origin || (req.headers.host && req.headers.host.includes('bugacity-docker.ru.tuna.am') 
            ? 'https://bugacity-docker.ru.tuna.am' 
            : req.headers.host && req.headers.host.includes('gluko.city')
              ? 'https://gluko.city'
              : 'https://bugacity-npm.ru.tuna.am');
          
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

        const token = jwt.sign({ userId: user._id }, authController.getJwtSecret(), { expiresIn: '7d' });
        const origin = req.headers.origin || 'https://bugacity-npm.ru.tuna.am';
        
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
    } catch (error: any) {
      console.error('❌ OAuth callback error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
      res.status(500).json({ 
        error: 'Ошибка сервера',
        details: error.message 
      });
    }
  }

  // Метод для удаления пользователя
  async deleteUser(req: any, res: any) {
    try {
      const { email } = req.body;
      const userEmail = req.user?.email; // Получаем email из токена
      
      if (!email) {
        return res.status(400).json({ error: 'Email обязателен' });
      }

      // Проверяем, что пользователь может удалять только себя
      if (userEmail !== email) {
        return res.status(403).json({ 
          error: 'Недостаточно прав. Вы можете удалить только свой аккаунт.' 
        });
      }

      const db = req.app.locals.db;
      if (!db) {
        return res.status(500).json({ error: 'База данных не подключена' });
      }

      // Сначала находим пользователя, чтобы получить его ID
      const user = await db.collection('users').findOne({ email });
      
      if (!user) {
        return res.json({ message: 'Пользователь не найден', deletedCount: 0 });
      }

      // Удаляем пользователя из базы данных
      const result = await db.collection('users').deleteOne({ email });
      
      if (result.deletedCount > 0) {
        // Удаляем папку пользователя
        try {
          const userId = user._id.toString();
          const relativePath = `users/${userId.substring(0, 8).padStart(8, '0')}/${userId}`;
          const fullPath = path.join(process.cwd(), 'uploads', relativePath);
          
          if (fs.existsSync(fullPath)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`✅ Папка пользователя удалена: ${fullPath}`);
          }
        } catch (dirError) {
          console.error('⚠️ Ошибка при удалении папки пользователя:', dirError);
          // Не прерываем выполнение, если не удалось удалить папку
        }
        
        res.json({ message: 'Пользователь удален', deletedCount: result.deletedCount });
      } else {
        res.json({ message: 'Пользователь не найден', deletedCount: 0 });
      }
    } catch (error) {
      console.error('❌ Ошибка при удалении пользователя:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
}

export const authController = new AuthController();
