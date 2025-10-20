const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');

// Импортируем конфигурацию
const config = require('./config');

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

// Функция для запуска браузера с постоянным профилем
async function launchBrowser(url) {
  console.log('🚀 Запуск браузера с постоянным профилем');
  console.log('=====================================');
  console.log(`🌐 URL: ${url}`);
  console.log('💾 Все данные сохраняются между сессиями');
  console.log('❌ Закройте браузер когда закончите');
  console.log('=====================================');
  
  // Используем существующий профиль
  const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');
  const browserOptions = {
    headless: false,
    slowMo: 100
  };

  const context = await chromium.launchPersistentContext(PROFILE_PATH, browserOptions);
  const page = context.pages()[0] || await context.newPage();
  
  // Слушаем события
  page.on('console', msg => {
    console.log(`📝 [${msg.type()}] ${msg.text()}`);
  });
  
  page.on('request', request => {
    if (request.url().includes('oauth') || request.url().includes('auth')) {
      console.log(`🌐 [REQUEST] ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('oauth') || response.url().includes('auth')) {
      console.log(`📡 [RESPONSE] ${response.status()} ${response.url()}`);
    }
  });
  
  // Открываем сайт
  await page.goto(url);
  console.log(`🌐 Открыт сайт: ${url}`);
  console.log('⏳ Ждем закрытия браузера...');

  // Ждем закрытия браузера
  await new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      try {
        await page.evaluate(() => document.title);
      } catch (error) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
  });

  console.log('✅ Браузер закрыт');
  console.log(`💾 Профиль сохранен: ${PROFILE_PATH}`);
}

// Список доступных тестов
const availableTests = {
  'reward': 'test-reward.js',
  'reward-simple': 'test-reward-simple.js',
  'reward-backend': 'test-reward-backend.js',
  'user-name': 'test-user-name-update.js',
  'registration-backend': 'test-registration-backend.js',
  'registration-frontend': 'test-registration-frontend.js',
  'yandex-oauth': 'test-yandex-oauth.js',
  'vk-oauth': 'test-vk-oauth.js',
  'all': 'internal', // Специальный маркер для внутренней функции
  'browser': 'internal'
};

// Список доступных окружений
const availableEnvironments = ['local', 'npm', 'docker', 'prod'];

// Функция для запуска всех тестов
async function runAllTests(environment = 'local') {
  // Устанавливаем переменную окружения для config.js
  process.env.TEST_ENVIRONMENT = environment;
  
  // Принудительно перезагружаем config.js с новым окружением
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  
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

  // Создаем браузер один раз для всех тестов с persistent context
  const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');
  const browserOptions = {
    headless: config.browser.headless,
    slowMo: config.browser.slowMo || 100,
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
        // Для OAuth тестов используем URL из конфигурации
        console.log(`🌐 Используем URL для OAuth: ${config.baseUrl}`);
        
        const yandexResult = await runYandexOAuthTest(page, context);
        results.yandexOAuth = yandexResult;
        console.log(`✅ Тест входа через Yandex OAuth завершен: ${yandexResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
      } catch (error) {
        console.error('❌ Ошибка в тесте входа через Yandex OAuth:', error.message);
        results.yandexOAuth = false;
      }
    }


  } catch (error) {
    console.error('❌ Критическая ошибка при запуске тестов:', error);
  } finally {
    // Закрываем контекст
    await context.close();
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
  // Устанавливаем переменную окружения для config.js
  process.env.TEST_ENVIRONMENT = environment;
  
  // Очищаем кэш модуля и перезагружаем config
  delete require.cache[require.resolve('./config')];
  const config = require('./config');
  const path = require('path');
  
  // Проверяем, нужен ли браузер для тестов (исключаем browser тест)
  const needsBrowser = testNames.some(testName => 
    testName === 'registration-frontend' || 
    testName === 'reward' || 
    testName === 'yandex-oauth' ||
    testName === 'vk-oauth'
  );
  
  let context = null;
  let page = null;
  
  if (needsBrowser) {
    const { chromium } = require('playwright');
    
    // Создаем браузер только для frontend тестов
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

    context = await chromium.launchPersistentContext(PROFILE_PATH, browserOptions);
    page = context.pages()[0] || await context.newPage();
  }
  
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
          result = await runBackendTest(environment);
        } else if (testName === 'yandex-oauth') {
          // Для OAuth тестов перезагружаем конфигурацию с правильным окружением
          delete require.cache[require.resolve('./config')];
          const { runYandexOAuthTest } = require('./test-yandex-oauth');
          result = await runYandexOAuthTest(page, context);
        } else if (testName === 'vk-oauth') {
          // Для OAuth тестов используем URL из конфигурации
          const { runVKOAuthTest } = require('./test-vk-oauth');
          result = await runVKOAuthTest();
        } else if (testName === 'browser') {
          // Запуск браузера для ручного тестирования
          try {
            const url = config.urls[environment] || config.baseUrl;
            console.log(`🔍 Browser тест: environment=${environment}, url=${url}`);
            await launchBrowser(url);
            result = true;
          } catch (error) {
            console.error('❌ Ошибка browser теста:', error.message);
            result = false;
          }
        } else {
          // Для других тестов используем старый способ
          const testFile = availableTests[testName];
          const testPath = path.join(__dirname, testFile);
          
          let spawnArgs = [testPath];
          spawnArgs.push(environment);
          
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
        
        if (testName === 'browser') {
          console.log(`\n📝 Тест "${testName}" завершён (ручной). Исключён из оценки.`);
        } else {
          console.log(`\n📊 Результат теста "${testName}": ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
          results.push({ testName, success: result, result });
        }
        
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
    // Закрываем браузер только если он был создан
    if (context) {
      await context.close();
      console.log('✅ Браузер закрыт');
    }
  }
  
  // Выводим итоговые результаты
  // Разделяем автоматические и ручные тесты
  const automaticTests = results.filter(r => r.testName !== 'browser');
  const manualTests = testNames.filter(name => name === 'browser');
  
  if (automaticTests.length > 0) {
    console.log('\n📊 АВТОМАТИЧЕСКИЕ ТЕСТЫ:');
    console.log('============================');
    automaticTests.forEach((result, index) => {
      const status = result.success ? '✅ УСПЕХ' : '❌ ОШИБКА';
      console.log(`${index + 1}. ${result.testName}: ${status}`);
    });
    
    const successCount = automaticTests.filter(r => r.success).length;
    const totalCount = automaticTests.length;
    
    console.log(`\n🎯 АВТОМАТИЧЕСКИЕ: ${successCount}/${totalCount} тестов пройдено`);
    
    if (successCount === totalCount && successCount > 0) {
      console.log('🎉 ВСЕ АВТОМАТИЧЕСКИЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    } else if (successCount > 0) {
      console.log('⚠️  НЕКОТОРЫЕ АВТОМАТИЧЕСКИЕ ТЕСТЫ НЕ ПРОЙДЕНЫ');
    }
  }
  
  if (manualTests.length > 0) {
    console.log('\n📝 РУЧНЫЕ ТЕСТЫ:');
    console.log('============================');
    manualTests.forEach((testName, index) => {
      console.log(`${index + 1}. ${testName}: завершён (ручной)`);
    });
    console.log(`\n📝 РУЧНЫЕ: ${manualTests.length} тестов выполнено`);
  }
  
  // Выход с кодом только на основе автоматических тестов
  if (automaticTests.length > 0) {
    const successCount = automaticTests.filter(r => r.success).length;
    const totalCount = automaticTests.length;
    
    if (successCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } else {
    // Если только ручные тесты, всегда успех
    process.exit(0);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Если параметры не указаны, запускаем все тесты
    runAllTests('local').then(success => {
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

  if (args[0] === '--help' || args[0] === '-h') {
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
    runAllTests(environment).then(success => {
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
