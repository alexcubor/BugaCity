const { chromium } = require('playwright');
const config = require('./config');
const path = require('path');

// Путь к профилю браузера
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

// Email для тестирования
const TEST_EMAIL = 'alexcubor@yandex.ru';

// Функция для удаления пользователя из базы данных
async function deleteTestUser() {
  console.log(`🗑️  Удаляем пользователя ${TEST_EMAIL} из базы данных...`);
  
  try {
    // Попробуем удалить конкретного пользователя через API
    const response = await fetch(`${config.api.baseUrl}/api/users/${TEST_EMAIL}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log(`✅ Пользователь ${TEST_EMAIL} удален`);
    } else if (response.status === 404) {
      console.log(`ℹ️  Пользователь ${TEST_EMAIL} не найден в базе данных`);
    } else {
      console.log('⚠️  Удаление пользователя не удалось, продолжаем тест');
    }
  } catch (error) {
    console.error('❌ Ошибка при удалении пользователя:', error);
  }
}

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
      console.log(`✅ Popup окно Yandex закрылось`);
      
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
      console.log('✅ Пользователь успешно авторизован через Yandex OAuth');
      
      // Проверяем HTML - ищем аватар пользователя
      console.log('🔍 Проверяем HTML на наличие аватара...');
      const html = await page.content();
      
      // Ищем аватар в HTML
      if (html.includes('uploads/users/')) {
        console.log('✅ Аватар найден в HTML!');
        // Извлекаем путь к аватару
        const avatarMatch = html.match(/uploads\/users\/[^"'\s]+/);
        if (avatarMatch) {
          console.log(`📸 Путь к аватару: ${avatarMatch[0]}`);
        }
      } else {
        console.log('❌ Аватар НЕ найден в HTML');
        console.log('🔍 Ищем дефолтную иконку...');
        if (html.includes('user_icon.svg')) {
          console.log('⚠️  Показывается дефолтная иконка вместо аватара');
        }
      }
      
      // Проверяем, есть ли токен в localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'));
      if (token) {
        console.log('✅ Токен найден в localStorage');
        // Декодируем токен для проверки
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log(`🔍 ID пользователя из токена: ${payload.userId}`);
          
          // Проверяем API запрос к пользователю
          console.log('🔍 Проверяем API запрос к пользователю...');
          const apiResponse = await page.evaluate(async (userId) => {
            try {
              const response = await fetch(`/api/users/${userId}`);
              const data = await response.json();
              return { success: true, data, status: response.status };
            } catch (error) {
              return { success: false, error: error.message };
            }
          }, payload.userId);
          
          if (apiResponse.success) {
            console.log(`✅ API запрос успешен (статус: ${apiResponse.status})`);
            console.log(`🔍 Данные пользователя:`, JSON.stringify(apiResponse.data, null, 2));
            if (apiResponse.data.avatar) {
              console.log(`📸 Аватар в API: ${apiResponse.data.avatar}`);
            } else {
              console.log('❌ Аватар отсутствует в API ответе');
            }
          } else {
            console.log(`❌ API запрос не удался: ${apiResponse.error}`);
          }
        } catch (e) {
          console.log('⚠️  Не удалось декодировать токен');
        }
      } else {
        console.log('❌ Токен НЕ найден в localStorage');
      }
      
      // Дополнительная проверка - убеждаемся, что мы на главной странице
      console.log('🔍 Проверяем, что мы находимся на главной странице...');
      const currentUrl = page.url();
      console.log(`📍 Текущий URL: ${currentUrl}`);
      
      // Проверяем, что URL содержит наш домен (не остались на Yandex)
      if (!currentUrl.includes('bugacity-docker.ru.tuna.am') && 
          !currentUrl.includes('bugacity-npm.ru.tuna.am') && 
          !currentUrl.includes('gluko.city') &&
          !currentUrl.includes('localhost')) {
        console.log('❌ Не находимся на главной странице приложения');
        return false;
      }
      console.log('✅ Находимся на главной странице приложения');
      
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

  // Удаляем тестового пользователя из базы данных
  await deleteTestUser();

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
  await runYandexOAuthTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runYandexOAuthTest, testYandexLogin };
