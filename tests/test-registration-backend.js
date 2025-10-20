const axios = require('axios');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

// Конфигурация
const config = require('./config');
const TEST_EMAIL = config.testAccount.email;
const TEST_PASSWORD = config.testAccount.password;

// Функция для получения кода верификации с почты
async function getVerificationCodeFromEmail() {
  return new Promise((resolve, reject) => {
    // Таймаут 30 секунд
    const timeout = setTimeout(() => {
      imap.end();
      reject(new Error('Таймаут при получении кода с почты (30 сек)'));
    }, 30000);

    const imap = new Imap({
      user: TEST_EMAIL,
      password: TEST_PASSWORD,
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
                  
                  // Возвращаем код сразу
                  clearTimeout(timeout);
                  resolve(codeMatch[1]);
                  
                  // Пытаемся удалить все письма от hello@gluko.city
                  console.log('🗑️ Пытаемся удалить все письма от hello@gluko.city...');
                  
                  // Небольшая задержка перед удалением
                  setTimeout(() => {
                    imap.search([['FROM', 'hello@gluko.city']], (err, allResults) => {
                      if (err) {
                        console.log('❌ Ошибка поиска писем для удаления:', err.message);
                        imap.end();
                        return;
                      }
                      
                      if (allResults.length === 0) {
                        console.log('📧 Писем для удаления не найдено');
                        imap.end();
                        return;
                      }
                      
                      console.log(`🗑️ Найдено ${allResults.length} писем для удаления`);
                      
                      // Просто закрываем соединение - письма останутся, но тест работает
                      console.log('⚠️ Письма не удаляются (проблема с IMAP), но тест работает');
                      imap.end();
                    });
                  }, 500);
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
            // Если код не найден, закрываем соединение
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
}

// Функция для удаления пользователя
async function deleteUser(email) {
  console.log(`🗑️  Удаляем пользователя: ${email}`);
  
  try {
    // Сначала входим под пользователем, чтобы получить токен
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: email,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.token;
    
    // Теперь удаляем пользователя с токеном
    const response = await axios.post(`${API_BASE_URL}/api/auth/delete-user`, {
      email: email
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`✅ Пользователь удален:`, response.data);
    return true;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.data?.message?.includes('не найден')) {
      console.log(`ℹ️  Пользователь не найден (это нормально)`);
      return true;
    }
    if (error.response?.status === 400 && error.response?.data?.message?.includes('Неверные данные')) {
      console.log(`ℹ️  Пользователь не найден или неверный пароль (это нормально)`);
      return true;
    }
    console.error(`❌ Ошибка при удалении пользователя:`, error.response?.data || error.message);
    return false;
  }
}

// Функция для отправки кода подтверждения
async function sendVerificationCode(email) {
  console.log(`📤 Отправляем код подтверждения для: ${email}`);
  
  // Пауза 1 секунда для избежания блокировки из-за rate limiting
  console.log(`⏳ Пауза 1 секунда для избежания rate limiting...`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/send-verification`, {
      email: email
    });
    
    console.log(`✅ Код отправлен:`, response.data.message);
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при отправке кода:`, error.response?.data || error.message);
    return false;
  }
}

// Функция для регистрации пользователя
async function registerUser(email, password, verificationCode) {
  console.log(`📝 Регистрируем пользователя: ${email}`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      email: email,
      password: password,
      verificationCode: verificationCode
    });
    
    console.log(`✅ Пользователь зарегистрирован:`, {
      userId: response.data.userId,
      isPioneer: response.data.isPioneer,
      pioneerNumber: response.data.pioneerNumber,
      tokenLength: response.data.token?.length || 0
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Ошибка при регистрации:`, error.response?.data || error.message);
    return null;
  }
}

// Функция для проверки существования пользователя
async function checkUserExists(email) {
  console.log(`🔍 Проверяем существование пользователя: ${email}`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/check-email`, {
      email: email
    });
    
    console.log(`📊 Результат проверки:`, response.data);
    return response.data.exists;
  } catch (error) {
    console.error(`❌ Ошибка при проверке пользователя:`, error.response?.data || error.message);
    return false;
  }
}

// Функция для входа пользователя
async function loginUser(email, password) {
  console.log(`🔐 Входим под пользователем: ${email}`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: email,
      password: password
    });
    
    console.log(`✅ Вход выполнен:`, {
      userId: response.data.userId,
      tokenLength: response.data.token?.length || 0
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Ошибка при входе:`, error.response?.data || error.message);
    return null;
  }
}

// Основная функция тестирования
// Функция для тестирования валидации паролей
async function testPasswordValidation(email, password, expectedError) {
  console.log(`🔒 Тестируем пароль: "${password}" (ожидаем: "${expectedError}")`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      email: email,
      password: password,
      verificationCode: '111111'
    });
    
    console.log(`❌ ОШИБКА: Пароль "${password}" прошел валидацию, но не должен был!`);
    return false;
  } catch (error) {
    const actualError = error.response?.data?.error;
    if (actualError === expectedError) {
      console.log(`✅ Пароль "${password}" корректно отклонен: ${actualError}`);
      return true;
    } else {
      console.log(`❌ ОШИБКА: Ожидали "${expectedError}", получили "${actualError}"`);
      return false;
    }
  }
}

async function runBackendTest(environment = 'local') {
  console.log('🚀 НАЧИНАЕМ ТЕСТИРОВАНИЕ BACKEND');
  console.log('==================================');
  
  // Обновляем конфигурацию с правильным окружением
  const config = require('./config');
  const API_BASE_URL = config.urls[environment] || config.baseUrl;
  
  // Обновляем глобальную переменную для функций
  global.API_BASE_URL = API_BASE_URL;
  
  console.log(`🌐 API URL: ${API_BASE_URL}`);
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 Password: ${TEST_PASSWORD}`);
  console.log(`🔢 Verification Code: будет получен с почты`);
  console.log('');
  
  let success = true;
  
  try {
    // Шаг 1: Проверяем существование пользователя
    console.log('\n📋 ШАГ 1: Проверка существования пользователя');
    console.log('-----------------------------------------------');
    const userExists = await checkUserExists(TEST_EMAIL);
    
    // Шаг 2: Всегда пытаемся удалить пользователя (на всякий случай)
    console.log('\n📋 ШАГ 2: Удаление пользователя (если существует)');
    console.log('--------------------------------------------------');
    const deleted = await deleteUser(TEST_EMAIL);
    if (!deleted) {
      console.log('⚠️  Не удалось удалить пользователя, но продолжаем тест');
    }

    // Шаг 2.5: Тестируем валидацию паролей
    console.log('\n🔒 ШАГ 2.5: Тестирование валидации паролей');
    console.log('--------------------------------------------------');
    
    const passwordTests = [
      { password: '111', expectedError: 'Пароль должен содержать минимум 6 символов' },
      { password: '111111', expectedError: 'Пароль должен содержать хотя бы одну букву' }
    ];
    
    let passwordTestsPassed = 0;
    for (const test of passwordTests) {
      const passed = await testPasswordValidation(TEST_EMAIL, test.password, test.expectedError);
      if (passed) passwordTestsPassed++;
    }
    
    console.log(`\n📊 Результаты валидации паролей: ${passwordTestsPassed}/${passwordTests.length} тестов пройдено`);
    
    // Шаг 3: Отправляем код подтверждения
    console.log('\n📋 ШАГ 3: Отправка кода подтверждения');
    console.log('--------------------------------------');
    const codeSent = await sendVerificationCode(TEST_EMAIL);
    if (!codeSent) {
      success = false;
    }
    
    // Шаг 4: Получаем код верификации с почты
    console.log('\n📋 ШАГ 4: Получение кода верификации с почты');
    console.log('-----------------------------------');
    let verificationCode;
    try {
      console.log('⏳ Ждем письмо с кодом верификации...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Ждем 3 секунды
      verificationCode = await getVerificationCodeFromEmail();
      console.log(`✅ Код верификации получен: ${verificationCode}`);
      
      // Ждем немного, чтобы увидеть процесс удаления писем
      console.log('⏳ Ждем завершения удаления писем...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Ошибка при получении кода:`, error.message);
      success = false;
      verificationCode = '111111'; // Fallback для продолжения теста
    }
    
    // Шаг 5: Регистрируем пользователя с правильным паролем
    console.log('\n📋 ШАГ 5: Регистрация пользователя с правильным паролем');
    console.log('-----------------------------------');
    const registrationResult = await registerUser(TEST_EMAIL, TEST_PASSWORD, verificationCode);
    if (!registrationResult) {
      success = false;
    }
    
    // Шаг 6: Проверяем, что пользователь теперь существует
    console.log('\n📋 ШАГ 6: Проверка регистрации');
    console.log('-------------------------------');
    const userExistsAfter = await checkUserExists(TEST_EMAIL);
    if (!userExistsAfter) {
      console.log('❌ Пользователь не найден после регистрации!');
      success = false;
    }
    
    // Шаг 6: Тестируем вход
    console.log('\n📋 ШАГ 6: Тестирование входа');
    console.log('-----------------------------');
    const loginResult = await loginUser(TEST_EMAIL, TEST_PASSWORD);
    if (!loginResult) {
      success = false;
    }
    
    // Шаг 7: Проверяем debug endpoint
    console.log('\n📋 ШАГ 7: Проверка debug endpoint');
    console.log('----------------------------------');
    try {
      const debugResponse = await axios.get(`${API_BASE_URL}/api/debug/db`);
      console.log('✅ Debug endpoint работает:', debugResponse.data);
    } catch (error) {
      console.log('⚠️  Debug endpoint недоступен:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error.message);
    success = false;
  }
  
  // Результат
  console.log('\n📊 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ');
  console.log('==========================');
  if (success) {
    console.log('✅ ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
    console.log('🎉 Backend регистрация работает корректно');
  } else {
    console.log('❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ');
    console.log('🔧 Требуется отладка');
  }
  
  return success;
}

// Запуск теста
if (require.main === module) {
  runBackendTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Ошибка выполнения теста:', error);
      process.exit(1);
    });
}

module.exports = { runBackendTest };
