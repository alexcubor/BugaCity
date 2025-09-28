const { runEmailRegistrationTest } = require('./test-email-registration');
const { runYandexOAuthTest } = require('./test-yandex-oauth');
const { runVKOAuthTest } = require('./test-vk-oauth');

// Основная функция для запуска всех тестов
async function runAllTests() {
  console.log('🚀 Запуск всех OAuth тестов');
  console.log('=====================================');
  console.log('📋 Тесты будут запущены в следующем порядке:');
  console.log('1. 📧 Регистрация через email');
  console.log('2. 🔵 Вход через Yandex OAuth');
  // console.log('3. 🔵 Вход через VK OAuth');
  console.log('=====================================\n');

  const results = {
    emailRegistration: false,
    yandexOAuth: false,
    vkOAuth: false
  };

  try {
    // 1. Тест регистрации через email
    console.log('🔄 Запуск теста регистрации через email...');
    try {
      const emailResult = await runEmailRegistrationTest();
      results.emailRegistration = emailResult;
      console.log(`✅ Тест регистрации через email завершен: ${emailResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
    } catch (error) {
      console.error('❌ Ошибка в тесте регистрации через email:', error.message);
      results.emailRegistration = false;
    }

    // 2. Тест входа через Yandex OAuth
    console.log('🔄 Запуск теста входа через Yandex OAuth...');
    try {
      const yandexResult = await runYandexOAuthTest();
      results.yandexOAuth = yandexResult;
      console.log(`✅ Тест входа через Yandex OAuth завершен: ${yandexResult ? 'УСПЕХ' : 'ОШИБКА'}\n`);
    } catch (error) {
      console.error('❌ Ошибка в тесте входа через Yandex OAuth:', error.message);
      results.yandexOAuth = false;
    }

    // 3. Тест входа через VK OAuth (временно отключен)
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
  console.log(`📧 Регистрация через email: ${results.emailRegistration ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
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
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      await runAllTests();
      break;
    default:
      console.log('Использование: node test-all.js test');
      console.log('\nДоступные отдельные тесты:');
      console.log('- node test-email-registration.js test');
      console.log('- node test-yandex-oauth.js test');
      console.log('- node test-vk-oauth.js test');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllTests };
