import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import awardRoutes from './routes/awards';

// Загружаем переменные окружения
dotenv.config({ path: '.env.dev' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'client/public')));



// MongoDB подключение
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/social_network';

MongoClient.connect(mongoUri)
  .then(client => {
    const db = client.db();
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
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
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
