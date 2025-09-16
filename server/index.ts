import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import awardRoutes from './routes/awards';

// Переменные окружения загружаются через Docker Compose

// Функция для чтения секретов из файлов
function readSecret(secretPath: string): string {
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch (error) {
    console.error(`Failed to read secret from ${secretPath}:`, error);
    return '';
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'client/public')));



// MongoDB подключение
// Читаем пароль MongoDB из секрета
const mongodbPassword = readSecret('/run/secrets/mongodb_password_v2') || 'password123';
const mongoUri = `mongodb://admin:${mongodbPassword}@mongodb:27017/glukograd?authSource=admin`;

MongoClient.connect(mongoUri)
  .then(client => {
    const db = client.db('glukograd');
    app.locals.db = db; // Сохраняем db в app.locals для доступа в контроллерах
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/awards', awardRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
