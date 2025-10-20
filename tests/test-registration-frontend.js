const { chromium } = require('playwright');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

// Загружаем config динамически
function getConfig() {
  return require('./config');
}

// Путь к профилю браузера
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

// Функция для получения кода верификации с почты
const getVerificationCodeFromEmail = async () => {
  return new Promise((resolve, reject) => {
    // Таймаут 30 секунд
    const timeout = setTimeout(() => {
      imap.end();
      reject(new Error('Таймаут при получении кода с почты (30 сек)'));
    }, 30000);

    const imap = new Imap({
      user: getConfig().testAccount.email,
      password: getConfig().testAccount.password,
      host: 'mail.jino.ru',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Ищем последние письма (сначала непрочитанные, потом все)
        console.log('🔍 Ищем непрочитанные письма от hello@gluko.city...');
        imap.search(['UNSEEN', ['FROM', 'hello@gluko.city']], (err, results) => {
          if (err) {
            console.log('❌ Ошибка поиска непрочитанных писем:', err.message);
            clearTimeout(timeout);
            imap.end();
            reject(err);
            return;
          }
          
          if (results.length === 0) {
            // Если непрочитанных нет, ищем все письма от отправителя
            console.log('📧 Непрочитанных писем нет, ищем все письма от hello@gluko.city...');
            imap.search([['FROM', 'hello@gluko.city']], (err2, results2) => {
              if (err2) {
                console.log('❌ Ошибка поиска всех писем:', err2.message);
                clearTimeout(timeout);
                imap.end();
                reject(err2);
                return;
              }
              
              if (results2.length === 0) {
                console.log('❌ Писем от hello@gluko.city не найдено');
                clearTimeout(timeout);
                imap.end();
                reject(new Error('Не найдено писем с кодом верификации'));
                return;
              }
              
              console.log(`📧 Найдено ${results2.length} писем от hello@gluko.city`);
              processMessages(results2);
            });
          } else {
            console.log(`📧 Найдено ${results.length} непрочитанных писем от hello@gluko.city`);
            processMessages(results);
          }
        });

        function processMessages(results) {
          console.log(`📧 Обрабатываем ${results.length} писем...`);
          const messageId = results.slice(-1)[0]; // Берем последнее письмо
          console.log(`📧 Берем письмо с ID: ${messageId}`);
          const fetch = imap.fetch(messageId, { bodies: '' });
          
          fetch.on('message', (msg, seqno) => {
            console.log(`📧 Обрабатываем письмо ${seqno}...`);
            msg.on('body', (stream, info) => {
              console.log(`📧 Парсим тело письма...`);
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  console.log(`❌ Ошибка парсинга письма:`, err.message);
                  reject(err);
                  return;
                }

                const text = parsed.text || '';
                console.log(`📧 Текст письма (первые 200 символов):`, text.substring(0, 200));
                
                const codeMatch = text.match(/код верификации[:\s]*(\d{6})/i) || 
                                 text.match(/verification code[:\s]*(\d{6})/i) ||
                                 text.match(/(\d{6})/);

                console.log(`🔍 Найденный код:`, codeMatch ? codeMatch[1] : 'не найден');

                if (codeMatch) {
                  console.log(`✅ Код найден: ${codeMatch[1]}`);
                  clearTimeout(timeout);
                  resolve(codeMatch[1]);
                  imap.end();
                } else {
                  clearTimeout(timeout);
                  imap.end();
                  reject(new Error('Код верификации не найден в письме'));
                }
              });
            });
          });

          fetch.once('error', (err) => {
            clearTimeout(timeout);
            imap.end();
            reject(err);
          });

          fetch.once('end', () => {
            if (!imap._ended) {
              imap.end();
            }
          });
        }
      });
    });

    imap.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    imap.connect();
  });
};


// Функция для удаления пользователя из базы данных
async function deleteUserFromDB(email) {
  try {
    console.log(`🔄 Попытка удаления пользователя ${email} из базы данных...`);
    
    // Сначала пытаемся войти, чтобы получить токен
    let token = null;
    const passwords = ['111', getConfig().testAccount.password, '111111'];
    
    for (const password of passwords) {
      try {
        const loginResponse = await fetch(`${getConfig().baseUrl}/api/auth/login`, {
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
    
    const response = await fetch(`${getConfig().baseUrl}/api/auth/delete-user`, {
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
        await fetch(`${getConfig().baseUrl}/api/auth/logout`, {
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
    // Проверяем, находимся ли мы на странице авторизации
    const currentUrl = page.url();
    if (!currentUrl.includes('/auth')) {
      // Если не на странице авторизации, переходим туда
      await page.goto(getConfig().baseUrl + '/auth');
      await page.waitForTimeout(1000);
    }

    // Ждем загрузки формы авторизации
    await page.waitForSelector('.auth-form-container', { timeout: 5000 });

             // Переходим на вкладку "Регистрация" (только если еще не на ней)
             const isLoginMode = await page.isVisible('button:has-text("Регистрация")');
             if (isLoginMode) {
               await page.click('button:has-text("Регистрация")');
               await page.waitForTimeout(500);
             }

             // Заполняем email и отправляем код (только если поле пустое)
             const emailField = await page.locator('input[type="email"]');
             const emailValue = await emailField.inputValue();
             if (!emailValue) {
               await page.fill('input[type="email"]', email);
               await page.press('input[type="email"]', 'Enter');
               await page.waitForTimeout(2000);
             }

             // Заполняем код подтверждения (только если поле пустое)
             const codeField = await page.locator('input[type="text"]');
             const codeValue = await codeField.inputValue();
             if (!codeValue) {
               // Получаем реальный код из почты
               console.log('📧 Получаем код верификации из почты...');
               const verificationCode = await getVerificationCodeFromEmail();
               console.log(`✅ Получен код: ${verificationCode}`);
               
               await page.fill('input[type="text"]', verificationCode);
               await page.press('input[type="text"]', 'Enter');
               await page.waitForTimeout(2000);
             }

             // Заполняем поле пароля и нажимаем Enter
             await page.fill('input[type="password"]', password);
             await page.press('input[type="password"]', 'Enter');
             await page.waitForTimeout(500);

    if (expectedError === null) {
      // Ожидаем, что пароль пройдет валидацию (нет ошибки)
      // Ждем немного, чтобы валидация сработала
      await page.waitForTimeout(1000);
      
      // Проверяем, появилось ли поле подтверждения пароля
      const confirmPasswordField = await page.locator('//*[@id="root"]/div/div[1]/div/div/div/form/div/div[4]/input');
      const isVisible = await confirmPasswordField.isVisible();
      
      if (isVisible) {
        console.log(`✅ Пароль "${password}" корректно прошел валидацию - появилось поле подтверждения`);
        
        // Заполняем поле подтверждения пароля
        await confirmPasswordField.fill(password);
        console.log(`✅ Поле подтверждения пароля заполнено`);
        
        await page.waitForTimeout(200);
        return true;
      } else {
        // Проверяем, есть ли ошибка валидации
        const messageElement = await page.locator('.message.error');
        const errorMessage = await messageElement.textContent();
        if (errorMessage && errorMessage.trim() !== '') {
          console.log(`❌ ОШИБКА: Пароль "${password}" должен был пройти валидацию, но получили ошибку: "${errorMessage}"`);
        } else {
          console.log(`❌ ОШИБКА: Пароль "${password}" прошел валидацию, но поле подтверждения не появилось`);
        }
        await page.waitForTimeout(200);
        return false;
      }
    } else {
      // Ожидаем ошибку валидации
      await page.waitForTimeout(1000); // Ждем валидацию
      
      const messageElement = await page.locator('.message.error');
      const messageText = await messageElement.textContent();
      
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

// Функция для тестирования поля имени и кнопки "Получить награду"
async function testNameInput(page) {
  console.log(`\n📝 Тестируем поле имени и кнопку "Получить награду"`);
  
  try {
    console.log('📝 Заполняем имя и фамилию...');
    // Попробуем разные селекторы для поля ввода имени
    const nameInputSelectors = [
      'input[placeholder="Имя и фамилия"]',
      'input[placeholder*="Имя и фамилия"]',
      'input[placeholder*="имя" i]',
      'input[placeholder*="name" i]',
      'input[type="text"]',
      'input:not([type="email"]):not([type="password"])',
      '//*[@id="root"]/div[3]/div/form/input'
    ];
    
    let nameInputFound = false;
    for (const selector of nameInputSelectors) {
      try {
        await page.fill(selector, 'Александр Кубор');
        console.log(`✅ Имя заполнено с селектором: ${selector}`);
        nameInputFound = true;
        break;
      } catch (error) {
        console.log(`ℹ️  Селектор ${selector} не сработал`);
      }
    }
    
    if (!nameInputFound) {
      console.log('❌ Не удалось найти поле для ввода имени');
      return false;
    }
    
    console.log('⌨️ Нажимаем Enter для отправки формы с именем...');
    await page.keyboard.press('Enter');
    console.log('⏳ Ждем 2 секунды после отправки формы...');
    await page.waitForTimeout(2000);
    
    console.log('✅ Имя и фамилия заполнены');
    
    // Нажимаем кнопку "Получить награду"
    console.log('🏆 Нажимаем кнопку "Получить награду"...');
    try {
      await page.click('button:has-text("Получить награду")', { timeout: 5000 });
      console.log('⏳ Ждем 3 секунды, чтобы увидеть модальное окно с наградой...');
      await page.waitForTimeout(3000);
      console.log('✅ Кнопка "Получить награду" нажата');
    } catch (error) {
      console.log('ℹ️  Кнопка "Получить награду" не найдена или уже нажата');
    }
    
    // НЕ закрываем модальное окно с наградой - оставляем его открытым для просмотра
    console.log('🏆 Модальное окно с наградой оставлено открытым для просмотра');
    console.log('⏳ Ждем еще 5 секунд, чтобы увидеть результат...');
    await page.waitForTimeout(5000);
    
    // Тест завершен успешно, пользователь остается авторизованным
    console.log('✅ Тест регистрации завершен успешно');
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при тестировании поля имени: ${error.message}`);
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
    
    // Форма авторизации уже видна на странице /auth
    await page.waitForSelector('.auth-form-container', { timeout: 5000 });
    
    // Переключаемся на регистрацию (только если еще не в режиме регистрации)
    const isLoginMode = await page.isVisible('button:has-text("Регистрация")');
    if (isLoginMode) {
      console.log('🔄 Переключаемся на режим регистрации...');
      await page.click('button:has-text("Регистрация")');
      await page.waitForTimeout(500);
    } else {
      console.log('ℹ️  Уже в режиме регистрации');
    }
    
    // Все поля уже заполнены после тестов валидации, просто нажимаем кнопку регистрации
    console.log('🔘 Нажимаем кнопку регистрации...');
    await page.click('button[type="submit"]');
    
    // Ждем успешной регистрации - модальное окно должно закрыться
    console.log('⏳ Ждем завершения регистрации...');
    try {
      // Ждем, пока модальное окно закроется (максимум 10 секунд)
      await page.waitForSelector('.auth-modal', { state: 'hidden', timeout: 10000 });
      console.log(`✅ Регистрация через email успешна - модальное окно закрылось`);
      
      // Ждем появления модального окна для ввода имени
      console.log('🔍 Ждем появления модального окна для ввода имени...');
      console.log('⏳ Ждем 3 секунды, чтобы увидеть модальное окно...');
      await page.waitForTimeout(3000);
      
      // Проверяем, что происходит на странице после регистрации
      console.log('🔍 Проверяем текущий URL:', page.url());
      
      // Ищем различные возможные селекторы модального окна
      const modalSelectors = [
        '.modal-overlay',
        '.modal',
        '[role="dialog"]',
        '.dialog',
        '.popup',
        '.overlay'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          console.log(`✅ Модальное окно найдено с селектором: ${selector}`);
          modalFound = true;
          break;
        } catch (error) {
          console.log(`ℹ️  Селектор ${selector} не найден`);
        }
      }
      
      if (modalFound) {
        console.log('📝 Пытаемся заполнить имя и нажать кнопку "Получить награду"...');
        const nameResult = await testNameInput(page);
        if (nameResult) {
          console.log('✅ Успешно заполнили имя и нажали кнопку награды');
        } else {
          console.log('❌ Не удалось заполнить имя или найти кнопку награды');
        }
      } else {
        console.log('ℹ️  Модальное окно для ввода имени не найдено');
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
async function runEmailRegistrationTest(page = null, context = null) {
  console.log('🚀 Запуск теста регистрации через email');
  console.log('=====================================');
  console.log(`📁 Профиль: ${PROFILE_PATH}`);
  console.log(`🌐 URL: ${getConfig().baseUrl}`);
  console.log(`🖱️  Виртуальный курсор: ${getConfig().browser.showCursor ? '✅ Включен' : '❌ Отключен'}`);
  console.log(`⏱️  Скорость анимации: ${getConfig().browser.slowMo}ms`);
  console.log('=====================================');

  // Используем переданные page и context или создаем новые
  let shouldCloseContext = false;
  if (!page || !context) {
    // Настройки браузера из конфигурации
    const browserOptions = {
      headless: getConfig().browser.headless,
      slowMo: getConfig().browser.slowMo,
      timeout: getConfig().browser.timeout,
      devtools: getConfig().browser.devtools || false,
      args: [
        '--show-cursor',
        '--force-cursor-visible',
        '--enable-cursor-compositing',
        '--disable-cursor-compositing=false',
        '--enable-features=VaapiVideoDecoder'
      ]
    };

    // Отключаем кэш если настроено
    if (getConfig().browser.disableCache) {
      browserOptions.args.push(
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--aggressive-cache-discard'
      );
      console.log('🚫 Кэш браузера отключен');
    }

    // Используем обычный launch для поддержки записи видео
    const browser = await chromium.launch(browserOptions);
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    shouldCloseContext = true;
  }

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
    // Открываем страницу авторизации
    await page.goto(getConfig().baseUrl + '/auth');
    console.log(`🌐 Открыт сайт: ${getConfig().baseUrl}/auth`);

    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle');
    
    
    // 1. Удаляем пользователя из базы данных
    await deleteUserFromDB(getConfig().testAccount.email);
    
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
      { password: getConfig().testAccount.password, expectedError: null } // Правильный пароль, должен пройти
    ];
    
    let passwordTestsPassed = 0;
    for (const test of passwordTests) {
      const passed = await testPasswordValidation(page, getConfig().testAccount.email, test.password, test.expectedError);
      if (passed) passwordTestsPassed++;
    }
    
    console.log(`\n📊 Результаты валидации паролей: ${passwordTestsPassed}/${passwordTests.length} тестов пройдено`);

    // 5. Тестируем регистрацию через email
    const result = await testEmailRegistration(page, getConfig().testAccount.email, getConfig().testAccount.password);
    
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
    return false;
  } finally {
    console.log('\n✅ Тестирование завершено');
    // Закрываем браузер только если мы его создавали
    if (shouldCloseContext && context) {
      await context.close();
    }
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
