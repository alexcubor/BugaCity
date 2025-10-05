require('dotenv').config({ path: '.env.dev' });

const environment = process.argv[2] || 'local';

const urls = {
  local: 'http://localhost:3000',
  npm: 'https://bugacity-npm.ru.tuna.am',
  docker: 'http://localhost:3001',
  prod: 'https://gluko.city'
};

const config = {
  baseUrl: process.env.TEST_API_URL || urls[environment] || urls.local,
  urls: urls,
  browser: {
    headless: false,
    slowMo: 100,
    timeout: 60000
  },
  testAccount: {
    email: 'sdiz@ya.ru',
    password: '111111a'
  }
};

console.log(`🌐 Окружение: ${environment}`);
console.log(`🔗 URL: ${config.baseUrl}`);

module.exports = config;