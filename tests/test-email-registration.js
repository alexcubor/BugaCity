const { chromium } = require('playwright');
const config = require('./config');
const path = require('path');

// Путь к профилю браузера
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

// Функция для удаления пользователя из базы данных
async function deleteUserFromDB(email) {
  try {
    console.log(`🔄 Попытка удаления пользователя ${email} из базы данных...`);
    const response = await fetch(`${config.api.baseUrl}/api/auth/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

// Функция тестирования регистрации через email
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
    
    // Шаг 1: Заполняем email и нажимаем "Далее"
    console.log('📝 Шаг 1: Заполняем email...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div > div > input[type=email]', email);
    
    console.log('➡️ Нажимаем кнопку "Далее"...');
    await page.click('#root > div > div.auth-modal-overlay > div > form > button');
    await page.waitForTimeout(800);
    
    // Шаг 2: Заполняем код подтверждения (111111) и нажимаем "Далее"
    console.log('📝 Шаг 2: Заполняем код подтверждения...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=text]', '111111');
    
    console.log('➡️ Нажимаем кнопку "Далее"...');
    await page.click('#root > div > div.auth-modal-overlay > div > form > button');
    await page.waitForTimeout(800);
    
    // Шаг 3: Заполняем пароль и нажимаем "Далее"
    console.log('📝 Шаг 3: Заполняем пароль...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=password]', password);
    
    console.log('➡️ Нажимаем кнопку "Далее"...');
    await page.click('#root > div > div.auth-modal-overlay > div > form > button');
    await page.waitForTimeout(800);
    
    // Шаг 4: Повторяем пароль и нажимаем "Зарегистрироваться"
    console.log('📝 Шаг 4: Повторяем пароль...');
    await page.fill('#root > div > div.auth-modal-overlay > div > form > div.form-fields-container > div.form-field.slide-in > input[type=password]', password);
    
    console.log('📤 Нажимаем "Зарегистрироваться"...');
    await page.click('#root > div > div.auth-modal-overlay > div > form > button');
    
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
        
        console.log('📤 Отправляем форму с именем...');
        await page.click('#root > div > div.modal-overlay > div > form > button');
        await page.waitForTimeout(800);
        
        console.log('✅ Имя и фамилия заполнены');
        
        // Закрываем модальное окно с наградой
        console.log('🏆 Закрываем модальное окно с наградой...');
        try {
          await page.click('#root > div > div:nth-child(3) > header > nav > div > div > div > button');
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
    
    // 4. Тестируем регистрацию через email
    const result = await testEmailRegistration(page, 'sdiz@ya.ru', '111');
    
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
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      await runEmailRegistrationTest();
      break;
    default:
      console.log('Использование: node test-email-registration.js test');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runEmailRegistrationTest, testEmailRegistration };
