// Инициализация базы данных MongoDB
db = db.getSiblingDB('glukograd');

// Создаем пользователя для приложения
db.createUser({
  user: 'glukograd_user',
  pwd: 'glukograd_password',
  roles: [
    {
      role: 'readWrite',
      db: 'glukograd'
    }
  ]
});

// Создаем коллекции
db.createCollection('users');
db.createCollection('awards');
db.createCollection('sessions');

// Создаем индексы для оптимизации
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.awards.createIndex({ userId: 1 });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('Database initialized successfully');
