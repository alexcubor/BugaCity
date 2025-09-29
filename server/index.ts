import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import rewardRoutes from './routes/rewards';

// Загружаем переменные окружения из .env.dev файла
dotenv.config({ path: '.env.dev' });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
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

  // Если запущено в Swarm с секретом, используем DNS-имя сервиса 'mongodb'
  const secretPath = process.env.MONGODB_PASSWORD_FILE || '';
  const useSwarmDns = secretPath && fs.existsSync(secretPath);
  const mongoHost = useSwarmDns ? 'mongodb' : 'localhost';
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
