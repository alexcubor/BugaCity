import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

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

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

// Страница входа
app.get('/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
