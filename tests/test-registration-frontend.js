const { chromium } = require('playwright');
const config = require('./config');
const path = require('path');

// Путь к профилю браузера
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

// Функция для удаления пользователя из базы данных
async function deleteUserFromDB(email) {
  try {
    console.log(`🔄 Попытка удаления пользователя ${email} из базы данных...`);
    
    // Сначала пытаемся войти, чтобы получить токен
    let token = null;
    const passwords = ['111', '111111a', '111111'];
    
    for (const password of passwords) {
      try {
        const loginResponse = await fetch(`${config.api.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          token = loginData.token;
          console.log(`🔑 Получен токен для удаления пользователя с паролем: ${password}`);
          break;
        }
      } catch (loginError) {
        console.log(`ℹ️  Не удалось войти с паролем: ${password}`);
      }
    }
    
    if (!token) {
      console.log(`ℹ️  Не удалось войти под пользователем ни с одним паролем`);
    }
    
    // Теперь пытаемся удалить пользователя
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${config.api.baseUrl}/api/auth/delete-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    console.log(`📡 Ответ API: ${JSON.stringify(result)}`);
    
    if (response.ok) {
      console.log(`✅ Пользователь ${email} удален из базы данных`);
    } else {
      console.log(`ℹ️  Пользователь ${email} не найден в базе данных`);
    }
  } catch (error) {
    console.error(`❌ Ошибка при удалении пользователя: ${error.message}`);
  }
}

// Функция для выхода из системы
async function logoutUser(page) {
  console.log(`🚪 Выходим из системы...`);
  
  try {
    // 1. Принудительно выходим через API (если есть токен)
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (token) {
      console.log('🚪 Принудительный выход через API...');
      try {
        await fetch(`${config.api.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ API выход выполнен');
      } catch (apiError) {
        console.log('ℹ️  API выход не удался, продолжаем через UI');
      }
    }
    
    // 2. Очищаем localStorage и sessionStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('✅ Локальное хранилище очищено');
    
    // 3. Принудительно обновляем страницу
    await page.reload({ waitUntil: 'networkidle' });
    console.log('✅ Страница обновлена');
    
    // 4. Проверяем, авторизован ли пользователь после обновления
    const isLoggedIn = await page.isVisible('.user-menu, .logout-button');
    if (!isLoggedIn) {
      console.log(`✅ Пользователь не авторизован`);
      return true;
    }
    
    // 5. Если все еще авторизован, пытаемся выйти через UI
    console.log('🚪 Пытаемся выйти через UI...');
    
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

// Функция тестирования регистрации через email
// Функция для тестирования валидации паролей
async function testPasswordValidation(page, email, password, expectedError) {
  console.log(`🔒 Тестируем пароль: "${password}" (ожидаем: "${expectedError}")`);
  
  try {
    // Проверяем, открыто ли модальное окно
    const modalVisible = await page.isVisible('.auth-modal');
    
    if (!modalVisible) {
      // Если модальное окно не открыто, открываем его
      await page.click('.login-button');
      await page.waitForTimeout(1000);

      // Переходим на вкладку "Регистрация" - используем XPath селектор
      await page.click('//*[@id="root"]/div/div[3]/div/button[2]');
      await page.waitForTimeout(500);

      // Заполняем email и отправляем код
      await page.fill('input[type="email"]', email);
      await page.press('input[type="email"]', 'Enter');
      await page.waitForTimeout(2000);

      // Заполняем код подтверждения - используем XPath селектор
      await page.fill('//*[@id="root"]/div/div[3]/div/form/div[1]/div[2]/input', '111111');
      await page.press('//*[@id="root"]/div/div[3]/div/form/div[1]/div[2]/input', 'Enter');
      await page.waitForTimeout(2000);
    }

    // Заполняем поле пароля и нажимаем Enter
    await page.fill('input[type="password"]', password);
    await page.press('input[type="password"]', 'Enter');
    await page.waitForTimeout(500);

    // Проверяем результат валидации
    const messageElement = await page.locator('.message.error');
    const messageText = await messageElement.textContent();
    
    if (expectedError === null) {
      // Ожидаем, что пароль пройдет валидацию (нет ошибки)
      if (!messageText || messageText.trim() === '') {
        console.log(`✅ Пароль "${password}" корректно прошел валидацию`);
        
        // Проверяем, что появилось поле подтверждения пароля
        const confirmPasswordField = await page.locator('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=password]');
        const isVisible = await confirmPasswordField.isVisible();
        if (isVisible) {
          console.log(`✅ Поле подтверждения пароля появилось`);
          
          // Заполняем поле подтверждения пароля
          await confirmPasswordField.fill(password);
          console.log(`✅ Поле подтверждения пароля заполнено`);
          
          await page.waitForTimeout(200);
          return true;
        } else {
          console.log(`❌ ОШИБКА: Поле подтверждения пароля не появилось`);
          await page.waitForTimeout(200);
          return false;
        }
      } else {
        console.log(`❌ ОШИБКА: Пароль "${password}" должен был пройти валидацию, но получили ошибку: "${messageText}"`);
        await page.waitForTimeout(200);
        return false;
      }
    } else {
      // Ожидаем ошибку валидации
      if (messageText && messageText.includes(expectedError)) {
        console.log(`✅ Пароль "${password}" корректно отклонен: ${messageText}`);
        await page.waitForTimeout(200);
        return true;
      } else {
        console.log(`❌ ОШИБКА: Ожидали "${expectedError}", получили "${messageText || 'нет ошибки'}"`);
        await page.waitForTimeout(200);
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка при тестировании пароля "${password}":`, error.message);
    
    // Закрываем модальное окно при ошибке
    try {
      await page.click('.close-button');
      await page.waitForTimeout(500);
    } catch (closeError) {
      console.log('ℹ️  Не удалось закрыть модальное окно, продолжаем');
    }
    
    return false;
  }
}

async function testEmailRegistration(page, email, password) {
  console.log(`\n📧 Тестируем регистрацию через email: ${email}`);
  
  try {
    // Закрываем любые открытые модальные окна
    const modalVisibleReg = await page.isVisible('.auth-modal');
    if (modalVisibleReg) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }
    
    // Открываем модальное окно авторизации
    await page.click('.login-button');
    await page.waitForSelector('.auth-modal', { timeout: 5000 });
    
    // Переключаемся на регистрацию
    console.log('🔄 Переключаемся на режим регистрации...');
    await page.click('#root > div > div.auth-modal-overlay > div > button:nth-child(4)');
    await page.waitForTimeout(500);
    
    // Шаг 1: Заполняем email и нажимаем Enter
    console.log('📝 Шаг 1: Заполняем email...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div > div > input[type=email]', email);
    
    console.log('⌨️ Нажимаем Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    
    // Шаг 2: Заполняем код подтверждения (111111) и нажимаем Enter
    console.log('📝 Шаг 2: Заполняем код подтверждения...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=text]', '111111');
    
    console.log('⌨️ Нажимаем Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    
    // Шаг 3: Заполняем пароль и нажимаем Enter
    console.log('📝 Шаг 3: Заполняем пароль...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=password]', password);
    
    console.log('⌨️ Нажимаем Enter...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    
    // Шаг 4: Повторяем пароль и нажимаем Enter
    console.log('📝 Шаг 4: Повторяем пароль...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=password]', password);
    
    console.log('⌨️ Нажимаем Enter для регистрации...');
    await page.keyboard.press('Enter');
    
    // Ждем успешной регистрации - модальное окно должно закрыться
    console.log('⏳ Ждем завершения регистрации...');
    try {
      // Ждем, пока модальное окно закроется (максимум 10 секунд)
      await page.waitForSelector('.auth-modal', { state: 'hidden', timeout: 10000 });
      console.log(`✅ Регистрация через email успешна - модальное окно закрылось`);
      
      // Ждем появления модального окна для ввода имени
      console.log('🔍 Ждем появления модального окна для ввода имени...');
      try {
        await page.waitForSelector('.modal-overlay', { timeout: 5000 });
        console.log('✅ Модальное окно для ввода имени появилось');
        
        console.log('📝 Заполняем имя и фамилию...');
        await page.fill('#root > div > div.modal-overlay > div > form > input[type=text]', 'Александр Кубор');
        
        console.log('⌨️ Нажимаем Enter для отправки формы с именем...');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800);
        
        console.log('✅ Имя и фамилия заполнены');
        
        // Закрываем модальное окно с наградой
        console.log('🏆 Закрываем модальное окно с наградой...');
        try {
          // Кликаем в любом месте кроме canvas для закрытия модального окна
          await page.click('header', { timeout: 1000 });
          await page.waitForTimeout(500);
          console.log('✅ Модальное окно с наградой закрыто');
        } catch (error) {
          console.log('ℹ️  Модальное окно с наградой не найдено или уже закрыто');
        }
        
        // Разлогиниваемся после получения награды
        console.log('🚪 Разлогиниваемся после получения награды...');
        await logoutUser(page);
      } catch (error) {
        console.log('ℹ️  Модальное окно для ввода имени не появилось в течение 5 секунд');
      }
      
      return true;
    } catch (error) {
      // Если модальное окно не закрылось, проверяем сообщения
      const successMessage = await page.isVisible('.message.success');
      const errorMessage = await page.isVisible('.message.error');
      
      if (successMessage) {
        console.log(`✅ Регистрация через email успешна - есть сообщение об успехе`);
        return true;
      } else if (errorMessage) {
        console.log(`❌ Регистрация через email не удалась - есть сообщение об ошибке`);
        return false;
      } else {
        console.log(`❌ Регистрация через email не удалась - модальное окно не закрылось`);
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Ошибка при тестировании регистрации: ${error.message}`);
    return false;
  }
}

// Основная функция теста
async function runEmailRegistrationTest() {
  console.log('🚀 Запуск теста регистрации через email');
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
    
    // 1. Удаляем пользователя из базы данных
    await deleteUserFromDB('sdiz@ya.ru');
    
    // 2. Принудительно выходим из системы (если залогинены)
    console.log('🚪 Принудительно выходим из системы в начале теста...');
    await logoutUser(page);
    
    // 3. НЕ очищаем localStorage и sessionStorage - это может нарушить работу браузера
    console.log('ℹ️  Сохраняем данные браузера для стабильности...');
    
    // 4. Тестируем валидацию паролей
    console.log('\n🔒 ТЕСТИРОВАНИЕ ВАЛИДАЦИИ ПАРОЛЕЙ:');
    console.log('=====================================');
    
    const passwordTests = [
      { password: '111', expectedError: 'Пароль должен содержать минимум 6 символов' },
      { password: '111111', expectedError: 'Пароль должен содержать хотя бы одну букву' },
      { password: '111111a', expectedError: null } // Правильный пароль, должен пройти
    ];
    
    let passwordTestsPassed = 0;
    for (const test of passwordTests) {
      const passed = await testPasswordValidation(page, 'sdiz@ya.ru', test.password, test.expectedError);
      if (passed) passwordTestsPassed++;
    }
    
    console.log(`\n📊 Результаты валидации паролей: ${passwordTestsPassed}/${passwordTests.length} тестов пройдено`);

    // 5. Тестируем регистрацию через email
    const result = await testEmailRegistration(page, 'sdiz@ya.ru', '111111a');
    
    // Выводим результат
    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:');
    console.log('=====================================');
    console.log(`📧 Регистрация через email: ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
    
    if (result) {
      console.log('🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!');
    } else {
      console.log('⚠️  ТЕСТ НЕ ПРОЙДЕН');
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
  await runEmailRegistrationTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runEmailRegistrationTest, testEmailRegistration, testPasswordValidation };
