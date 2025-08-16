import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы клиента
app.use(express.static(path.join(process.cwd(), 'client/public')));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
