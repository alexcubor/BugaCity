const { spawn } = require('child_process');
const path = require('path');

// Импортируем функции тестов с обработкой ошибок
let runBackendTest, runEmailRegistrationTest, runYandexOAuthTest, runVKOAuthTest;

try {
  const backendModule = require('./test-registration-backend');
  runBackendTest = backendModule.runBackendTest;
} catch (error) {
  console.error('Ошибка импорта test-registration-backend:', error.message);
}

try {
  const frontendModule = require('./test-registration-frontend');
  runEmailRegistrationTest = frontendModule.runEmailRegistrationTest;
} catch (error) {
  console.error('Ошибка импорта test-registration-frontend:', error.message);
}

try {
  const yandexModule = require('./test-yandex-oauth');
  runYandexOAuthTest = yandexModule.runYandexOAuthTest;
} catch (error) {
  console.error('Ошибка импорта test-yandex-oauth:', error.message);
}

try {
  const vkModule = require('./test-vk-oauth');
  runVKOAuthTest = vkModule.runVKOAuthTest;
} catch (error) {
  console.error('Ошибка импорта test-vk-oauth:', error.message);
}

// Список доступных тестов
const availableTests = {
  'reward': 'test-reward.js',
  'reward-simple': 'test-reward-simple.js',
  'reward-backend': 'test-reward-backend.js',
  'user-name': 'test-user-name-update.js',
  'registration-backend': 'test-registration-backend.js',
  'registration-frontend': 'test-registration-frontend.js',
  'all': 'internal', // Специальный маркер для внутренней функции
  'browser': 'open-browser.js'
};

// Список доступных окружений
const availableEnvironments = ['local', 'npm', 'docker', 'prod'];

// Функция для запуска всех тестов
async function runAllTests() {
  console.log('🚀 Запуск всех тестов');
  console.log('=====================================');
  console.log('📋 Тесты будут запущены в следующем порядке:');
  console.log('1. ⚡ Backend регистрация (быстрый тест)');
  console.log('2. 🔵 Вход через Yandex OAuth');
  console.log('=====================================\n');

  const results = {
    backendRegistration: false,
    yandexOAuth: false
  };

  try {
    // 1. Быстрый backend тест регистрации
    console.log('⚡ Запуск быстрого backend теста регистрации...');
    if (!runBackendTest) {
      console.error('❌ Функция runBackendTest не импортирована');
      results.backendRegistration = false;
    } else {
      try {
        const backendResult = await runBackendTest();
        results.backendRegistration = backendResult;
        console.log(`✅ Backend тест завершен: ${backendResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
      } catch (error) {
        console.error('❌ Ошибка в backend тесте регистрации:', error.message);
        results.backendRegistration = false;
      }
    }

    // 2. Тест входа через Yandex OAuth
    console.log('🔄 Запуск теста входа через Yandex OAuth...');
    if (!runYandexOAuthTest) {
      console.error('❌ Функция runYandexOAuthTest не импортирована');
      results.yandexOAuth = false;
    } else {
      try {
        const yandexResult = await runYandexOAuthTest();
        results.yandexOAuth = yandexResult;
        console.log(`✅ Тест входа через Yandex OAuth завершен: ${yandexResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
      } catch (error) {
        console.error('❌ Ошибка в тесте входа через Yandex OAuth:', error.message);
        results.yandexOAuth = false;
      }
    }


  } catch (error) {
    console.error('❌ Критическая ошибка при запуске тестов:', error);
  }

  // Выводим итоговые результаты
  console.log('\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ВСЕХ ТЕСТОВ:');
  console.log('=====================================');
  console.log(`⚡ Backend регистрация: ${results.backendRegistration ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
  console.log(`🔵 Вход через Yandex OAuth: ${results.yandexOAuth ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);

  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 ИТОГО: ${successCount}/${totalTests} тестов пройдено`);

  if (successCount === totalTests) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
  } else if (successCount > 0) {
    console.log('⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
  } else {
    console.log('❌ ВСЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
  }

  console.log('\n✅ Все тесты завершены');
  
  return successCount === totalTests;
}

function showHelp() {
  console.log('🧪 Универсальный тест-раннер');
  console.log('============================');
  console.log('');
  console.log('Использование:');
  console.log('  node tests/run-test.js <тест> [окружение]');
  console.log('  node tests/run-test.js <тест1,тест2,тест3> [окружение]');
  console.log('');
  console.log('Доступные тесты:');
  Object.keys(availableTests).forEach(test => {
    console.log(`  - ${test}`);
  });
  console.log('');
  console.log('Доступные окружения:');
  availableEnvironments.forEach(env => {
    console.log(`  - ${env}`);
  });
  console.log('');
  console.log('Примеры:');
  console.log('  node tests/run-test.js reward local');
  console.log('  node tests/run-test.js reward-backend npm');
  console.log('  node tests/run-test.js browser prod');
  console.log('  node tests/run-test.js registration-frontend,reward local');
  console.log('');
}

// Функция для запуска множественных тестов
async function runMultipleTests(testNames, environment) {
  const { chromium } = require('playwright');
  const config = require('./config');
  const path = require('path');
  
  // Создаем браузер один раз для всех тестов
  const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');
  const browserOptions = {
    headless: config.browser.headless,
    slowMo: config.browser.slowMo,
    timeout: config.browser.timeout
  };

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
  }

  const context = await chromium.launchPersistentContext(PROFILE_PATH, browserOptions);
  const page = context.pages()[0] || await context.newPage();
  
  const results = [];
  
  try {
    for (let i = 0; i < testNames.length; i++) {
      const testName = testNames[i];
      
      console.log(`\n📁 Тест ${i + 1}/${testNames.length}: ${testName}`);
      console.log('============================');
      
      // Запускаем тест напрямую, передавая page и context
      let result;
      try {
        if (testName === 'registration-frontend') {
          const { runEmailRegistrationTest } = require('./test-registration-frontend');
          result = await runEmailRegistrationTest(page, context);
        } else if (testName === 'reward') {
          const { runRewardTest } = require('./test-reward');
          result = await runRewardTest(page, context);
        } else if (testName === 'registration-backend') {
          const { runBackendTest } = require('./test-registration-backend');
          result = await runBackendTest();
        } else {
          // Для других тестов используем старый способ
          const testFile = availableTests[testName];
          const testPath = path.join(__dirname, testFile);
          
          let spawnArgs = [testPath];
          if (testName === 'browser') {
            spawnArgs.push(config.baseUrl);
          } else {
            spawnArgs.push(environment);
          }
          
          result = await new Promise((resolve) => {
            const child = spawn('node', spawnArgs, {
              stdio: 'inherit',
              cwd: process.cwd()
            });
            
            child.on('close', (code) => {
              resolve({ success: code === 0, code });
            });
            
            child.on('error', (error) => {
              resolve({ success: false, error: error.message });
            });
          });
        }
        
        console.log(`\n📊 Результат теста "${testName}": ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
        results.push({ testName, success: result, result });
        
        // Если тест не прошел, продолжаем
        if (!result && i < testNames.length - 1) {
          console.log(`\n⚠️  Тест "${testName}" завершился с ошибкой.`);
          console.log('Продолжаем выполнение следующих тестов...');
        }
        
      } catch (error) {
        console.error(`❌ Ошибка в тесте "${testName}":`, error.message);
        results.push({ testName, success: false, error: error.message });
      }
    }
  } finally {
    // Закрываем браузер в конце всех тестов
    await context.close();
    console.log('✅ Браузер закрыт');
  }
  
  // Выводим итоговые результаты
  console.log('\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:');
  console.log('============================');
  results.forEach((result, index) => {
    const status = result.success ? '✅ УСПЕХ' : '❌ ОШИБКА';
    console.log(`${index + 1}. ${result.testName}: ${status}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n🎯 ИТОГО: ${successCount}/${totalCount} тестов пройдено`);
  
  if (successCount === totalCount) {
    console.log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    process.exit(0);
  } else {
    console.log('⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  // Поддержка множественных тестов через запятую
  const testNames = args[0].split(',').map(name => name.trim());
  const environment = args[1] || 'local';
  
  // Проверяем, существует ли окружение
  if (!availableEnvironments.includes(environment)) {
    console.error(`❌ Окружение "${environment}" не найдено!`);
    console.error('');
    console.error('Доступные окружения:');
    availableEnvironments.forEach(env => {
      console.error(`  - ${env}`);
    });
    process.exit(1);
  }

  // Проверяем каждый тест
  for (const testName of testNames) {
    if (!availableTests[testName]) {
      console.error(`❌ Тест "${testName}" не найден!`);
      console.error('');
      console.error('Доступные тесты:');
      Object.keys(availableTests).forEach(test => {
        console.error(`  - ${test}`);
      });
      process.exit(1);
    }
  }

  console.log(`🧪 Запуск тестов: ${testNames.join(', ')}`);
  console.log(`🌐 Окружение: ${environment}`);
  console.log('============================');
  console.log('');

  // Специальная обработка для теста 'all'
  if (testNames.includes('all')) {
    runAllTests().then(success => {
      console.log('');
      console.log('============================');
      if (success) {
        console.log('✅ Все тесты завершены успешно');
        process.exit(0);
      } else {
        console.log('❌ Некоторые тесты завершены с ошибкой');
        process.exit(1);
      }
    }).catch(error => {
      console.error('❌ Критическая ошибка:', error.message);
      process.exit(1);
    });
    return;
  }

  // Запускаем тесты последовательно
  runMultipleTests(testNames, environment);
}

if (require.main === module) {
  main();
}

module.exports = { availableTests, availableEnvironments, runAllTests };
