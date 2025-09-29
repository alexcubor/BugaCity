const axios = require('axios');

// Конфигурация
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_EMAIL = 'sdiz@ya.ru';
const TEST_PASSWORD = '111111a';
const TEST_VERIFICATION_CODE = '111111';

console.log('🧪 ТЕСТ BACKEND РЕГИСТРАЦИИ');
console.log('============================');
console.log(`🌐 API URL: ${API_BASE_URL}`);
console.log(`📧 Email: ${TEST_EMAIL}`);
console.log(`🔑 Password: ${TEST_PASSWORD}`);
console.log(`🔢 Verification Code: ${TEST_VERIFICATION_CODE}`);
console.log('');

// Функция для удаления пользователя
async function deleteUser(email) {
  console.log(`🗑️  Удаляем пользователя: ${email}`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/delete-user`, {
      email: email
    });
    
    console.log(`✅ Пользователь удален:`, response.data);
    return true;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.data?.message?.includes('не найден')) {
      console.log(`ℹ️  Пользователь не найден (это нормально)`);
      return true;
    }
    console.error(`❌ Ошибка при удалении пользователя:`, error.response?.data || error.message);
    return false;
  }
}

// Функция для отправки кода подтверждения
async function sendVerificationCode(email) {
  console.log(`📤 Отправляем код подтверждения для: ${email}`);
  
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
async function runBackendTest() {
  console.log('🚀 НАЧИНАЕМ ТЕСТИРОВАНИЕ BACKEND');
  console.log('==================================');
  
  let success = true;
  
  try {
    // Шаг 1: Проверяем существование пользователя
    console.log('\n📋 ШАГ 1: Проверка существования пользователя');
    console.log('-----------------------------------------------');
    const userExists = await checkUserExists(TEST_EMAIL);
    
    // Шаг 2: Удаляем пользователя (если существует)
    if (userExists) {
      console.log('\n📋 ШАГ 2: Удаление существующего пользователя');
      console.log('-----------------------------------------------');
      const deleted = await deleteUser(TEST_EMAIL);
      if (!deleted) {
        success = false;
      }
    } else {
      console.log('\n📋 ШАГ 2: Пользователь не существует, пропускаем удаление');
      console.log('----------------------------------------------------------');
    }
    
    // Шаг 3: Отправляем код подтверждения
    console.log('\n📋 ШАГ 3: Отправка кода подтверждения');
    console.log('--------------------------------------');
    const codeSent = await sendVerificationCode(TEST_EMAIL);
    if (!codeSent) {
      success = false;
    }
    
    // Шаг 4: Регистрируем пользователя
    console.log('\n📋 ШАГ 4: Регистрация пользователя');
    console.log('-----------------------------------');
    const registrationResult = await registerUser(TEST_EMAIL, TEST_PASSWORD, TEST_VERIFICATION_CODE);
    if (!registrationResult) {
      success = false;
    }
    
    // Шаг 5: Проверяем, что пользователь теперь существует
    console.log('\n📋 ШАГ 5: Проверка регистрации');
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
