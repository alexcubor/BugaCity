const { chromium } = require('playwright');
const config = require('./config');
const path = require('path');

// Путь к профилю браузера
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

// Функция для выхода из системы
async function logoutUser(page) {
  console.log(`🚪 Выходим из системы...`);
  
  try {
    // Проверяем, авторизован ли пользователь
    const isLoggedIn = await page.isVisible('.user-menu, .logout-button');
    if (!isLoggedIn) {
      console.log(`ℹ️  Пользователь не авторизован`);
      return true;
    }
    
    // Проверяем, не блокирует ли модальное окно с наградой
    const rewardModalVisible = await page.isVisible('.modal-overlay');
    if (rewardModalVisible) {
      console.log('🚪 Закрываем модальное окно с наградой перед выходом...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Нажимаем на меню пользователя
    await page.click('.user-menu, .logout-button');
    await page.waitForTimeout(500);
    
    // Нажимаем "Выйти"
    await page.click('button:has-text("Выйти"), .logout-button');
    await page.waitForTimeout(800);
    
    console.log(`✅ Выход из системы выполнен`);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при выходе из системы: ${error.message}`);
    return false;
  }
}

// Функция тестирования входа через Yandex OAuth
async function testYandexLogin(page) {
  console.log(`\n🔵 Тестируем вход через Yandex OAuth`);
  
  try {
    // Сначала проверяем, не авторизован ли уже пользователь
    const isLoggedIn = await page.isVisible('.user-menu, .logout-button');
    if (isLoggedIn) {
      console.log(`ℹ️  Пользователь уже авторизован, пропускаем Yandex OAuth`);
      return true;
    }
    
    // Проверяем, открыто ли уже модальное окно
    const modalOpen = await page.isVisible('.auth-modal');
    if (!modalOpen) {
      // Открываем модальное окно авторизации только если оно не открыто
      await page.click('.login-button');
      await page.waitForSelector('.auth-modal', { timeout: 5000 });
    }
    
    // Даем время браузеру "освоиться" перед OAuth
    console.log('⏳ Ждем 3 секунды перед OAuth...');
    await page.waitForTimeout(3000);
    
    // Сразу нажимаем кнопку Yandex (без заполнения полей)
    console.log('🔵 Нажимаем кнопку "Войти через Яндекс"...');
    await page.click('.social-buttons-row button[title="Войти через Яндекс"]');
    
    // Ждем открытия popup окна
    console.log('⏳ Ждем открытия popup окна Yandex...');
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 });
    const popup = await popupPromise;
    console.log('✅ Popup окно Yandex открылось');
    
    // Ждем завершения авторизации в popup
    console.log('⏳ Ждем завершения авторизации в popup...');
    console.log('ℹ️  У вас есть 90 секунд для подтверждения в Yandex');
    
    try {
      // Ждем, пока popup закроется или истечет timeout
      await popup.waitForEvent('close', { timeout: 90000 });
      console.log(`✅ Вход через Yandex OAuth успешен - popup закрылся`);
      return true;
    } catch (error) {
      console.log(`❌ Вход через Yandex OAuth не удался - popup не закрылся в течение 90 секунд`);
      console.log(`ℹ️  Возможно, нужно подтвердить разрешения в popup окне`);
      await popup.close();
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка при тестировании Yandex OAuth: ${error.message}`);
    return false;
  }
}

// Основная функция теста
async function runYandexOAuthTest() {
  console.log('🚀 Запуск теста входа через Yandex OAuth');
  console.log('=====================================');
  console.log(`📁 Профиль: ${PROFILE_PATH}`);
  console.log(`🌐 URL: ${config.api.baseUrl}`);
  console.log('=====================================');

  // Настройки браузера из конфигурации
  const browserOptions = {
    headless: config.browser.headless,
    slowMo: config.browser.slowMo,
    timeout: config.browser.timeout
  };

  // Отключаем кэш если настроено
  if (config.browser.disableCache) {
    browserOptions.args = [
      '--disable-application-cache',
      '--disable-offline-load-stale-cache',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--aggressive-cache-discard'
    ];
    console.log('🚫 Кэш браузера отключен');
  }

  const context = await chromium.launchPersistentContext(PROFILE_PATH, browserOptions);
  const page = context.pages()[0] || await context.newPage();

  // Слушаем события для отладки
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('OAuth') || msg.text().includes('auth')) {
      console.log(`📝 [${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`❌ [ERROR] ${error.message}`);
  });

  page.on('request', request => {
    if (request.url().includes('oauth') || request.url().includes('auth') || request.url().includes('vk.com') || request.url().includes('yandex.ru')) {
      console.log(`🌐 [REQUEST] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('oauth') || response.url().includes('auth') || response.url().includes('vk.com') || response.url().includes('yandex.ru')) {
      console.log(`📡 [RESPONSE] ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Открываем сайт
    await page.goto(config.api.baseUrl);
    console.log(`🌐 Открыт сайт: ${config.api.baseUrl}`);

    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle');
    
    // 1. Принудительно выходим из системы (если залогинены)
    console.log('🚪 Принудительно выходим из системы в начале теста...');
    await logoutUser(page);
    
    // 2. НЕ очищаем localStorage и sessionStorage - сохраняем сессию Yandex
    console.log('ℹ️  Сохраняем сессию Yandex в браузере...');
    
    // 3. Тестируем вход через Yandex OAuth
    const result = await testYandexLogin(page);
    
    // Выводим результат
    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('=====================================');
    console.log(`🔵 Вход через Yandex OAuth: ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
    
    if (result) {
      console.log('🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!');
    } else {
      console.log('⚠️  ТЕСТ НЕ ПРОЙДЕН');
      console.log('ℹ️  Возможно, требуется ручное подтверждение в popup окне');
    }
    
    return result;

  } catch (error) {
    console.error('❌ Произошла ошибка во время выполнения теста:', error);
  } finally {
    console.log('\n✅ Тестирование завершено');
    await context.close();
    console.log(`💾 Профиль сохранен: ${PROFILE_PATH}`);
  }
}

// CLI интерфейс
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      await runYandexOAuthTest();
      break;
    default:
      console.log('Использование: node test-yandex-oauth.js test');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runYandexOAuthTest, testYandexLogin };
