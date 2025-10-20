require('dotenv').config({ path: '.env.dev' });

const environment = process.env.TEST_ENVIRONMENT || 'local';

const urls = {
  local: 'http://localhost:3000',
  npm: 'https://bugacity-npm.ru.tuna.am',
  docker: 'https://bugacity-docker.ru.tuna.am',
  prod: 'https://gluko.city'
};

const fs = require('fs');

// Читаем пароль из файла
const mailPassword = fs.readFileSync('./secrets/mail_password.txt', 'utf8').trim();

const config = {
  baseUrl: process.env.TEST_API_URL || urls[environment] || urls.local,
  urls: urls,
  browser: {
    headless: false,
    slowMo: 100,
    timeout: 60000,
    showCursor: process.env.SHOW_CURSOR !== 'false', // Показываем виртуальный курсор (по умолчанию true)
    devtools: process.env.DEVTOOLS === 'true', // Можно включить для отладки
    disableCache: false // Не отключаем кэш, чтобы сохранить авторизацию
  },
  testAccount: {
    email: 'admin@buga.city',
    password: mailPassword
  }
};

console.log(`🌐 Окружение: ${environment}`);
console.log(`🔗 URL: ${config.baseUrl}`);

module.exports = config;