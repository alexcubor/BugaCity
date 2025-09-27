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

// Функция тестирования входа через VK OAuth
async function testVKLogin(page) {
  console.log(`\n🔵 Тестируем вход через VK OAuth`);
  
  try {
    // Сначала проверяем, не авторизован ли уже пользователь
    const isLoggedIn = await page.isVisible('.user-menu, .logout-button');
    if (isLoggedIn) {
      console.log(`ℹ️  Пользователь уже авторизован, пропускаем VK OAuth`);
      return true;
    }
    
    // Проверяем, открыто ли уже модальное окно
    const modalOpen = await page.isVisible('.auth-modal');
    if (!modalOpen) {
      // Открываем модальное окно авторизации только если оно не открыто
      await page.click('.login-button');
      await page.waitForSelector('.auth-modal', { timeout: 5000 });
    }
    
    // Сразу нажимаем кнопку VK (без заполнения полей)
    console.log('🔵 Нажимаем кнопку "Войти через VK"...');
    await page.click('.social-buttons-row div.social-btn');
    
    // Ждем открытия новой страницы VK
    console.log('⏳ Ждем открытия страницы VK...');
    const newPagePromise = page.waitForEvent('popup', { timeout: 10000 });
    const vkPage = await newPagePromise;
    console.log('✅ Страница VK открылась');
    
    // Ждем загрузки страницы VK и нажимаем кнопку "Разрешить"
    console.log('⏳ Ждем загрузки страницы VK...');
    await vkPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
    console.log('✅ Страница VK загружена');
    
    console.log('🔵 Нажимаем кнопку "Разрешить" на странице VK...');
    try {
      // Пробуем несколько способов найти кнопку "Разрешить"
      let buttonClicked = false;
      
      // Основной способ: Поиск по тексту "Разрешить"
      try {
        await vkPage.click('text="Разрешить"', { timeout: 5000 });
        buttonClicked = true;
        console.log('✅ Кнопка "Разрешить" найдена по тексту');
      } catch (e) {
        console.log('⚠️ Кнопка "Разрешить" не найдена по тексту, пробуем fallback...');
        
        // Fallback: Поиск по классу кнопки
        try {
          await vkPage.click('button.vkuiButton--mode-primary', { timeout: 3000 });
          buttonClicked = true;
          console.log('✅ Кнопка "Разрешить" найдена по классу');
        } catch (e2) {
          console.log('⚠️ Кнопка "Разрешить" не найдена по классу');
        }
      }
      
      if (!buttonClicked) {
        throw new Error('Не удалось найти кнопку "Разрешить"');
      }
      
      console.log('✅ Кнопка "Разрешить" нажата');
    } catch (error) {
      console.log('❌ Не удалось найти кнопку "Разрешить" на странице VK');
      console.log('❌ Ошибка:', error.message);
      await vkPage.close();
      return false;
    }
    
    // Ждем завершения авторизации в VK
    console.log('⏳ Ждем завершения авторизации в VK...');
    
    // Ждем, пока VK страница закроется (максимум 30 секунд)
    try {
      await vkPage.waitForEvent('close', { timeout: 30000 });
      console.log(`✅ Вход через VK OAuth успешен - страница VK закрылась`);
      
      // Даем время для завершения авторизации на основной странице
      console.log('⏳ Ждем завершения авторизации на основной странице...');
      await page.waitForTimeout(3000);
      
      // Проверяем, что модальное окно авторизации закрылось
      console.log('🔍 Проверяем, что модальное окно авторизации закрылось...');
      const modalStillOpen = await page.isVisible('.auth-modal');
      if (modalStillOpen) {
        console.log('❌ Модальное окно авторизации все еще открыто');
        return false;
      }
      console.log('✅ Модальное окно авторизации закрылось');
      
      // Проверяем, что пользователь действительно авторизован
      console.log('🔍 Проверяем, что пользователь авторизован...');
      const isLoggedIn = await page.isVisible('.user-menu, .logout-button');
      if (!isLoggedIn) {
        console.log('❌ Пользователь не авторизован после OAuth');
        return false;
      }
      console.log('✅ Пользователь успешно авторизован через VK OAuth');
      
      // Показываем страницу 3 секунды после успешного входа
      console.log('⏳ Показываем страницу 3 секунды после успешного входа...');
      await page.waitForTimeout(3000);
      
      return true;
    } catch (error) {
      console.log(`❌ Вход через VK OAuth не удался - страница VK не закрылась в течение 30 секунд`);
      await vkPage.close();
      return false;
    }
  } catch (error) {
    console.error(`❌ Ошибка при тестировании VK OAuth: ${error.message}`);
    return false;
  }
}

// Основная функция теста
async function runVKOAuthTest() {
  console.log('🚀 Запуск теста входа через VK OAuth');
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
    
    // 2. НЕ очищаем localStorage и sessionStorage - сохраняем сессию VK
    console.log('ℹ️  Сохраняем сессию VK в браузере...');
    
    // 3. Тестируем вход через VK OAuth
    const result = await testVKLogin(page);
    
    // Выводим результат
    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('=====================================');
    console.log(`🔵 Вход через VK OAuth: ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
    
    if (result) {
      console.log('🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!');
    } else {
      console.log('⚠️  ТЕСТ НЕ ПРОЙДЕН');
      console.log('ℹ️  Возможно, требуется ручное подтверждение в VK');
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
      await runVKOAuthTest();
      break;
    default:
      console.log('Использование: node test-vk-oauth.js test');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runVKOAuthTest, testVKLogin };
