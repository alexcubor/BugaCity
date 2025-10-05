const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Постоянный профиль в корне репозитория
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

async function launchPersistentBrowser(targetUrl = null) {
  // Используем переданный URL или URL из конфигурации
  const url = targetUrl || config.baseUrl;
  
  console.log('🚀 Запуск браузера с постоянным профилем');
  console.log('=====================================');
  console.log(`📁 Профиль: ${PROFILE_PATH}`);
  console.log(`🌐 URL: ${url}`);
  console.log('💾 Все данные сохраняются между сессиями');
  console.log('❌ Закройте браузер когда закончите');
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

  try {
    const page = context.pages()[0] || await context.newPage();

    // Слушаем события
    page.on('console', msg => {
      console.log(`📝 [${msg.type()}] ${msg.text()}`);
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

    // Открываем сайт
    await page.goto(url);
    console.log(`🌐 Открыт сайт: ${url}`);
    console.log('⏳ Ждем закрытия браузера...');

    // Ждем закрытия
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

  } finally {
    console.log('✅ Браузер закрыт');
    console.log(`💾 Профиль сохранен: ${PROFILE_PATH}`);
  }
}


// CLI интерфейс
async function main() {
  const url = process.argv[2];
  await launchPersistentBrowser(url);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { launchPersistentBrowser };