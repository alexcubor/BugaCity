import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import rewardRoutes from './routes/rewards';
import adminRoutes from './routes/admin';
import { authenticateToken } from './middleware/auth';
import { requireAdmin } from './middleware/roles';

// Загружаем переменные окружения из .env.dev файла
dotenv.config({ path: '.env.dev' });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Настраиваем Express для работы за прокси (Nginx)
app.set('trust proxy', 1);

// Шаг 1: Расширенный Helmet с дополнительными защитами
app.use(helmet({
  contentSecurityPolicy: false, // Отключаем CSP пока что
  crossOriginEmbedderPolicy: false, // Отключаем для OAuth
  crossOriginOpenerPolicy: false,   // Отключаем для OAuth popup
  crossOriginResourcePolicy: false, // Отключаем для OAuth
  
  // Дополнительные защитные заголовки
  hsts: {
    maxAge: 31536000, // 1 год
    includeSubDomains: true,
    preload: true
  },
  noSniff: true, // Запрещаем MIME-type sniffing
  frameguard: { action: 'deny' }, // Запрещаем встраивание в iframe
  xssFilter: true, // Включаем XSS фильтр браузера
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  dnsPrefetchControl: true, // Контролируем DNS prefetch
  ieNoOpen: true, // Защита от IE
  hidePoweredBy: true // Скрываем X-Powered-By
}));

// Шаг 2: Добавляем ограниченный CORS с исключениями для OAuth
const allowedOrigins = [
  'https://bugacity-npm.ru.tuna.am',
  'https://bugacity-docker.ru.tuna.am', 
  'https://gluko.city',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080'
];

app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения, Postman)
    if (!origin) return callback(null, true);
    
    // Разрешаем OAuth провайдеры
    const oauthDomains = [
      'oauth.yandex.ru',
      'login.yandex.ru', 
      'oauth.vk.com',
      'api.vk.com'
    ];
    
    if (oauthDomains.some(domain => origin.includes(domain))) {
      return callback(null, true);
    }
    
    // Проверяем whitelist доменов
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS заблокирован для origin: ${origin}`);
      callback(new Error('Не разрешено CORS политикой'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Total-Count'], // Заголовки, доступные клиенту
  maxAge: 86400, // Кэшируем preflight запросы на 24 часа
  optionsSuccessStatus: 200 // Для старых браузеров
}));

// Шаг 3: Rate Limiting с исключениями для OAuth и dev окружения
const isDevelopment = process.env.NODE_ENV === 'development';
const disableRateLimit = isDevelopment || process.env.DISABLE_RATE_LIMIT === 'true';

// Логируем состояние rate limiting
if (disableRateLimit) {
  const reason = isDevelopment ? 'dev режим' : 'DISABLE_RATE_LIMIT=true';
  console.log(`🔓 Rate limiting отключен (${reason})`);
} else {
  console.log('🔒 Rate limiting включен (продакшн режим)');
}

// Rate limiting только для продакшена
if (!disableRateLimit) {
  const limiter = rateLimit({
    windowMs: 1000, // 1 секунда
    max: 3, // максимум 3 запроса в секунду (как у VK)
    message: {
      error: 'Слишком много запросов с этого IP, попробуйте позже',
      retryAfter: '1 секунда'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Пропускаем OAuth callback endpoints, OAuth инициализацию и API для соцсетей
      return req.path.includes('/api/auth/callback') || 
             req.path.includes('/api/auth/oauth') ||
             req.path.includes('/api/auth/yandex') ||
             req.path.includes('/api/auth/vk') ||
             req.path.includes('/api/meta') || // Пропускаем мета-теги для соцсетей
             req.path.includes('/api/rewards/') && req.path.includes('/preview') || // Пропускаем превью изображения
             req.path.includes('/api/rewards') && req.method === 'GET' || // Пропускаем все GET запросы к наградам
             req.path.includes('/images/') || // Пропускаем статические изображения
             req.path.includes('/fonts/') || // Пропускаем шрифты
             req.path.includes('/models/') || // Пропускаем 3D модели
             req.path.includes('/textures/') || // Пропускаем текстуры
             req.path === '/' || // Пропускаем главную страницу
             req.path.includes('?user=') && req.path.includes('&reward='); // Пропускаем ссылки с параметрами наград
    }
  });

  app.use(limiter);
  
  // Сохраняем ссылку на limiter для возможности сброса
  app.locals.limiter = limiter;
}

// Auth rate limiting только для продакшена
if (!disableRateLimit) {
  const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 минут
    max: 10, // максимум 10 попыток входа за 5 минут (более разумно)
    message: {
      error: 'Слишком много попыток входа, попробуйте позже',
      retryAfter: '5 минут'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Пропускаем OAuth endpoints
      return req.path.includes('/api/auth/callback') || 
             req.path.includes('/api/auth/oauth') ||
             req.path.includes('/api/auth/yandex') ||
             req.path.includes('/api/auth/vk');
    }
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  
  // Сохраняем ссылку на authLimiter для возможности сброса
  app.locals.authLimiter = authLimiter;
}

app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'client/public')));

// Статический роут для аватаров
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));



// MongoDB подключение
let mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  // Читаем пароль из переменной или из файла (для Docker secrets)
  let mongodbPassword = 'bugacity_password'; // дефолтный пароль
  if (process.env.MONGODB_PASSWORD_FILE && fs.existsSync(process.env.MONGODB_PASSWORD_FILE)) {
    mongodbPassword = fs.readFileSync(process.env.MONGODB_PASSWORD_FILE, 'utf8').trim();
  } else if (process.env.MONGODB_PASSWORD) {
    mongodbPassword = process.env.MONGODB_PASSWORD;
  }

  // Определяем режим работы приложения
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Используем переменную окружения MONGODB_HOST или IP-адрес по умолчанию
  const mongoHost = process.env.MONGODB_HOST || (isDevelopment ? '172.18.0.4' : 'bugacity_mongodb');
  console.log(`[DB] NODE_ENV: ${process.env.NODE_ENV}, isDevelopment: ${isDevelopment}, mongoHost: ${mongoHost}`);
  mongoUri = `mongodb://bugacity_user:${mongodbPassword}@${mongoHost}:27017/bugacity?authSource=bugacity`;
}

console.log('[DB] Connecting to MongoDB using URI:', mongoUri);
async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    const client = await MongoClient.connect(mongoUri as string, { maxPoolSize: 10 });
    const db = client.db('bugacity');
    (app as any).locals.db = db;
    console.log('[DB] Connected to MongoDB (attempt', attempt, ')');
  } catch (err: any) {
    console.error('[DB] Connection error (attempt', attempt, '):', err?.message || err);
    if (attempt < 20) {
      setTimeout(() => connectWithRetry(attempt + 1), 1000);
    }
  }
}
connectWithRetry();

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);

// Временный отладочный endpoint для проверки подключения к БД
app.get('/api/debug/db', async (_req, res) => {
  try {
    const db: any = (app as any).locals.db;
    if (!db) {
      return res.status(503).json({ status: 'no-db' });
    }
    const cols = await db.listCollections().toArray();
    const awardsCount = await db.collection('awards').countDocuments().catch(() => null);
    return res.json({ status: 'ok', database: db.databaseName, collections: cols.map((c: any) => c.name), awardsCount });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e?.message });
  }
});

// Главная страница
app.get('/', (req, res) => {
  const htmlPath = path.join(process.cwd(), 'client/public/index.html');
  // Принудительно читаем файл каждый раз заново
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(htmlContent);
});

// Страница входа
app.get('/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

// Страница авторизации
app.get('/auth', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

// Админ-панель
app.get('/admin/scene', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

// API для получения списка HDR файлов
app.get('/api/hdri-files', (req, res) => {
  try {
    const hdriPath = path.join(process.cwd(), 'client/public/textures/environment');
    
    const files = fs.readdirSync(hdriPath);
    const hdrFiles = files.filter(file => file.toLowerCase().endsWith('.hdr'));
    
    res.json(hdrFiles);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при сканировании файлов' });
  }
});

// Админ страница - всегда возвращаем HTML, но проверка авторизации в клиенте
app.get('/admin', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
