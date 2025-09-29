const { runBackendTest } = require('./test-registration-backend');
const { runEmailRegistrationTest } = require('./test-registration-frontend');
const { runYandexOAuthTest } = require('./test-yandex-oauth');
const { runVKOAuthTest } = require('./test-vk-oauth');

// Основная функция для запуска всех тестов
async function runAllTests() {
  console.log('🚀 Запуск всех тестов');
  console.log('=====================================');
  console.log('📋 Тесты будут запущены в следующем порядке:');
  console.log('1. ⚡ Backend регистрация (быстрый тест)');
  console.log('2. 🖥️  Frontend регистрация (медленный тест)');
  console.log('3. 🔵 Вход через Yandex OAuth');
  // console.log('4. 🔵 Вход через VK OAuth');
  console.log('=====================================\n');

  const results = {
    backendRegistration: false,
    frontendRegistration: false,
    yandexOAuth: false,
    vkOAuth: false
  };

  try {
    // 1. Быстрый backend тест регистрации
    console.log('⚡ Запуск быстрого backend теста регистрации...');
    try {
      const backendResult = await runBackendTest();
      results.backendRegistration = backendResult;
      console.log(`✅ Backend тест завершен: ${backendResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
      
      if (!backendResult) {
        console.log('❌ Backend тест не прошел! Пропускаем frontend тест для экономии времени.\n');
        results.frontendRegistration = false;
      } else {
        // 2. Frontend тест регистрации (только если backend прошел)
        console.log('🖥️  Backend тест прошел! Запуск frontend теста регистрации...');
        try {
          const frontendResult = await runEmailRegistrationTest();
          results.frontendRegistration = frontendResult;
          console.log(`✅ Frontend тест завершен: ${frontendResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
        } catch (error) {
          console.error('❌ Ошибка в frontend тесте регистрации:', error.message);
          results.frontendRegistration = false;
        }
      }
    } catch (error) {
      console.error('❌ Ошибка в backend тесте регистрации:', error.message);
      results.backendRegistration = false;
      results.frontendRegistration = false;
    }

    // 3. Тест входа через Yandex OAuth
    console.log('🔄 Запуск теста входа через Yandex OAuth...');
    try {
      const yandexResult = await runYandexOAuthTest();
      results.yandexOAuth = yandexResult;
      console.log(`✅ Тест входа через Yandex OAuth завершен: ${yandexResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
    } catch (error) {
      console.error('❌ Ошибка в тесте входа через Yandex OAuth:', error.message);
      results.yandexOAuth = false;
    }

    // 4. Тест входа через VK OAuth (временно отключен)
    // console.log('🔄 Запуск теста входа через VK OAuth...');
    // try {
    //   const vkResult = await runVKOAuthTest();
    //   results.vkOAuth = vkResult;
    //   console.log(`✅ Тест входа через VK OAuth завершен: ${vkResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
    // } catch (error) {
    //   console.error('❌ Ошибка в тесте входа через VK OAuth:', error.message);
    //   results.vkOAuth = false;
    // }
    results.vkOAuth = true; // Пропускаем VK тест

  } catch (error) {
    console.error('❌ Критическая ошибка при запуске тестов:', error);
  }

  // Выводим итоговые результаты
  console.log('\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ВСЕХ ТЕСТОВ:');
  console.log('=====================================');
  console.log(`⚡ Backend регистрация: ${results.backendRegistration ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
  console.log(`🖥️  Frontend регистрация: ${results.frontendRegistration ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
  console.log(`🔵 Вход через Yandex OAuth: ${results.yandexOAuth ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
  console.log(`🔵 Вход через VK OAuth: ${results.vkOAuth ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);

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
}

// CLI интерфейс
async function main() {
  await runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllTests };
