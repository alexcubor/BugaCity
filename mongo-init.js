// Инициализация базы данных MongoDB
print('🚀 Starting MongoDB initialization...');

// Читаем пароль из файла (Docker secret)
const fs = require('fs');
let mongodbPassword;
try {
  mongodbPassword = fs.readFileSync('/run/secrets/mongodb_password', 'utf8').trim();
  print('✅ Password read from Docker secret');
} catch (e) {
  // Fallback для локальной разработки
  mongodbPassword = process.env.MONGODB_PASSWORD || 'default_password';
  print('⚠️  Using fallback password from environment');
}

// Переключаемся на базу данных bugacity
db = db.getSiblingDB('bugacity');
print('📁 Switched to bugacity database');

// Проверяем, существует ли пользователь
const existingUser = db.getUser('bugacity_admin');
if (existingUser) {
  print('👤 User bugacity_admin already exists, skipping creation');
} else {
  // Создаем пользователя для приложения
  db.createUser({
    user: 'bugacity_admin',
    pwd: mongodbPassword,
    roles: [
      {
        role: 'readWrite',
        db: 'bugacity'
      }
    ]
  });
  print('✅ User bugacity_admin created successfully');
}

// Создаем коллекции
db.createCollection('users');
db.createCollection('rewards');

// Создаем индексы для оптимизации
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.rewards.createIndex({ userId: 1 });

// Индексы для геолокации
db.users.createIndex({ "location.coordinates": "2dsphere" });
db.users.createIndex({ "location.lastUpdated": -1 });
db.users.createIndex({ "location.isActive": 1 });

// Создаем коллекцию дружбы
db.createCollection("friendships");

// Индексы для дружбы (критически важны для производительности!)
db.friendships.createIndex({ "requester": 1, "status": 1 });
db.friendships.createIndex({ "addressee": 1, "status": 1 });
db.friendships.createIndex({ "requester": 1, "addressee": 1 }, { unique: true });
db.friendships.createIndex({ "createdAt": -1 });

// Добавляем награду Pioneer (только если её нет)
const existingPioneer = db.rewards.findOne({ name: 'pioneer' });
if (!existingPioneer) {
  db.rewards.insertOne({
    name: 'pioneer',
    translations: {
      ru: {
        label: 'Пионер',
        description: 'Вручается первым пользователям Глюкограда'
      },
      en: {
        label: 'Pioneer',
        description: 'Awarded to the first users of Bugacity'
      }
    },
    price: 10000
  });
}

print('Database initialized successfully');
