// Инициализация базы данных MongoDB
db = db.getSiblingDB('bugacity');

// Создаем пользователя для приложения
db.createUser({
  user: 'bugacity_user',
  pwd: 'bugacity_password',
  roles: [
    {
      role: 'readWrite',
      db: 'bugacity'
    }
  ]
});

// Создаем коллекции
db.createCollection('users');
db.createCollection('rewards');
db.createCollection('sessions');

// Создаем индексы для оптимизации
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.rewards.createIndex({ userId: 1 });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

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
