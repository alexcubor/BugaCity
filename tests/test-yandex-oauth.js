const config = require('./config');

// Импортируем функцию logoutUser
const { logoutUser } = require('./test-registration-frontend');

// Email для тестирования
const TEST_EMAIL = 'alexcubor@yandex.ru';

// Функция для удаления пользователя из базы данных
async function deleteTestUser() {
  console.log(`🗑️  Удаляем пользователя ${TEST_EMAIL} из базы данных...`);
  
  try {
    // Попробуем удалить конкретного пользователя через API
    const response = await fetch(`${config.baseUrl}/api/users/${TEST_EMAIL}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Пользователь удален:', result);
      return true;
    } else if (response.status === 404) {
      console.log('ℹ️  Пользователь не найден в базе данных');
      return true;
    } else {
      console.log('⚠️  Не удалось удалить пользователя, но продолжаем тест');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Ошибка при удалении пользователя, но продолжаем тест');
    return false;
  }
}

// Функция тестирования входа через Yandex OAuth
async function testYandexLogin(page, context) {
  console.log(`\n🔵 Тестируем вход через Yandex OAuth`);
  
  try {
    // Проверяем, авторизован ли пользователь на нашем сайте
    const userMenu = await page.locator('.user-menu');
    const isLoggedIn = await userMenu.isVisible();
    
    if (isLoggedIn) {
      console.log('🚪 Пользователь авторизован на нашем сайте, выходим из системы...');
      
      // Нажимаем на меню пользователя
      await userMenu.click();
      await page.waitForTimeout(1000); // Ждем, пока откроется выпадающее меню
      
      // Ищем кнопку выхода в разных вариантах
      const logoutSelectors = [
        'button:has-text("Выйти")',
        'button:has-text("Выход")', 
        '.logout-button',
        '[data-testid="logout"]',
        'a:has-text("Выйти")',
        'a:has-text("Выход")',
        '.user-menu button:last-child',
        '.user-menu a:last-child',
        '.user-menu li:last-child',
        '.user-menu div:last-child',
        'button' // Просто кнопка с текстом "Выйти"
      ];
      
      let logoutButton = null;
      for (const selector of logoutSelectors) {
        try {
          logoutButton = await page.locator(selector);
          if (await logoutButton.isVisible()) {
            console.log(`✅ Найдена кнопка выхода с селектором: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`ℹ️  Селектор ${selector} не сработал`);
        }
      }
      
      if (logoutButton && await logoutButton.isVisible()) {
        await logoutButton.click();
        console.log('✅ Выход выполнен через UI');
        await page.waitForTimeout(2000); // Ждем, пока произойдет выход
      } else {
        console.log('⚠️  Кнопка выхода не найдена, но продолжаем тест');
      }
    } else {
      console.log('ℹ️  Пользователь не авторизован на нашем сайте, продолжаем тест');
    }
    
    // Ждем, куда нас перенаправит кнопка выхода
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`🌐 URL после выхода: ${currentUrl}`);
    
    // Если мы на главной странице, переходим на страницу авторизации
    if (currentUrl.includes('/') && !currentUrl.includes('/auth')) {
      console.log('🔄 Переходим на страницу авторизации...');
      await page.goto(config.baseUrl + '/auth');
      await page.waitForTimeout(2000);
    }
    
    // Проверяем содержимое страницы
    const pageContent = await page.textContent('body');
    console.log(`📄 Содержимое страницы (первые 200 символов): ${pageContent.substring(0, 200)}`);
    
    // Ищем кнопку Yandex на текущей странице
    console.log('🔍 Ищем кнопку Yandex...');
    
    // Даем время браузеру "освоиться" перед OAuth
    console.log('⏳ Ждем 3 секунды перед OAuth...');
    await page.waitForTimeout(3000);
    
    // Сразу нажимаем кнопку Yandex (без заполнения полей)
    console.log('🔵 Нажимаем кнопку "Войти через Яндекс"...');
    
    // Проверяем, что кнопка существует
    const yandexButton = await page.locator('.social-buttons-row button[title="Войти через Яндекс"]');
    const isVisible = await yandexButton.isVisible();
    console.log(`🔍 Кнопка Yandex найдена: ${isVisible}`);
    
    if (!isVisible) {
      console.log('❌ Кнопка Yandex не найдена!');
      return false;
    }
    
    // Добавляем слушатель для перехвата URL перед кликом
    page.on('request', request => {
      if (request.url().includes('oauth.yandex.ru')) {
        console.log('🌐 Yandex OAuth URL:', request.url());
      }
    });
    
    // Проверяем текущий URL перед кликом
    const urlBefore = page.url();
    console.log(`🌐 URL перед кликом: ${urlBefore}`);
    
    await page.click('.social-buttons-row button[title="Войти через Яндекс"]');
    
    // Проверяем URL после клика
    await page.waitForTimeout(1000);
    const urlAfter = page.url();
    console.log(`🌐 URL после клика: ${urlAfter}`);
    
    // Проверяем, что открылось popup окно с Yandex OAuth
    console.log('🔍 Проверяем, открылось ли popup окно...');
    
    // Ждем немного и проверяем, есть ли новые страницы в контексте
    await page.waitForTimeout(2000);
    const pages = context.pages();
    console.log(`📄 Количество открытых страниц: ${pages.length}`);
    
    if (pages.length > 1) {
      console.log('✅ Popup окно открылось');
      const popup = pages[pages.length - 1]; // Последняя открытая страница
      
      // Ждем загрузки popup окна
      await popup.waitForLoadState('domcontentloaded');
      const popupUrl = popup.url();
      console.log(`🌐 URL popup окна: ${popupUrl}`);
      
      if (popupUrl.includes('oauth.yandex.ru')) {
        console.log('✅ Popup окно содержит Yandex OAuth URL');
        console.log('⏳ Ждем завершения авторизации в popup окне...');
        console.log('ℹ️  У вас есть 30 секунд для подтверждения в Yandex');
        
        // Ждем, пока popup окно закроется само после авторизации
        try {
          await popup.waitForEvent('close', { timeout: 30000 });
          console.log('✅ Popup окно закрылось после авторизации');
          
          // Ждем, чтобы можно было посмотреть на результат
          console.log('⏳ Ждем 2 секунды, чтобы посмотреть на результат...');
          await page.waitForTimeout(2000);
          
          return true;
        } catch (error) {
          console.log('❌ Popup окно не закрылось в течение 30 секунд');
          await popup.close();
          return false;
        }
      } else {
        console.log('❌ Popup окно не содержит Yandex OAuth URL');
        await popup.close();
        return false;
      }
    } else {
      console.log('❌ Popup окно не открылось');
      return false;
    }
    
  } catch (error) {
    if (error.message.includes('Timeout')) {
      console.log('❌ Вход через Yandex OAuth не удался - popup не закрылся в течение 90 секунд');
      console.log('ℹ️  Возможно, нужно подтвердить разрешения в popup окне');
    } else {
      console.error(`❌ Ошибка при тестировании Yandex OAuth: ${error.message}`);
    }
    return false;
  }
}

// Основная функция теста
async function runYandexOAuthTest(page, context) {
  // Принудительно перезагружаем config.js с актуальным окружением
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  
  console.log('🚀 Запуск теста входа через Yandex OAuth');
  console.log(`🌐 Environment: ${process.env.TEST_ENVIRONMENT}`);
  console.log(`🌐 Base URL: ${config.baseUrl}`);
  console.log('=====================================');
  console.log(`🌐 URL: ${config.baseUrl}`);
  console.log('=====================================');

  // Удаляем тестового пользователя из базы данных
  await deleteTestUser();

  try {
    // Переходим на сайт
    console.log(`🌐 Переходим на сайт: ${config.baseUrl}`);
    await page.goto(config.baseUrl);
    console.log(`🌐 Текущий URL: ${page.url()}`);
    
    // Ждем загрузки страницы
    await page.waitForTimeout(1000);
    console.log('✅ Страница загружена');
    
    // Проверяем, есть ли контент на странице
    const bodyText = await page.textContent('body');
    console.log(`📄 Содержимое страницы (первые 200 символов): ${bodyText.substring(0, 200)}`);
    
    // Проверяем, есть ли элементы на странице
    const hasContent = await page.locator('body').isVisible();
    console.log(`🔍 Тело страницы видимо: ${hasContent}`);
    
    // Тестируем вход через Yandex OAuth
    const result = await testYandexLogin(page, context);
    
    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('=====================================');
    console.log(`🔵 Вход через Yandex OAuth: ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
    
    if (!result) {
      console.log('⚠️  ТЕСТ НЕ ПРОЙДЕН');
      console.log('ℹ️  Возможно, требуется ручное подтверждение в popup окне');
    }
    
    return result;

  } catch (error) {
    console.error('❌ Произошла ошибка во время выполнения теста:', error);
    return false;
  }
}

module.exports = { runYandexOAuthTest, testYandexLogin };