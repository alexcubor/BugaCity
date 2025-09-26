// Загружаем переменные окружения из .env файла
require('dotenv').config();

// Конфигурация для тестов
module.exports = {
  // API конфигурация
  api: {
    baseUrl: process.env.TEST_API_URL || 'https://bugacity-npm.ru.tuna.am'
  },
  
  // Настройки браузера
  browser: {
    disableCache: true, // Отключить кэш браузера
    headless: false, // Запускать в видимом режиме
    slowMo: 500, // Задержка между действиями (мс)
    timeout: 60000 // Таймаут для браузера
  }
};
