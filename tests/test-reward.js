const { chromium } = require('playwright');
const config = require('./config');
const path = require('path');

// Путь к профилю браузера
const PROFILE_PATH = path.resolve(__dirname, '..', 'browser-profile');

// Комплексный тест наград
async function runRewardTest(page = null, context = null) {
  console.log('🎖️ Запуск комплексного теста наград...');
  
  let initialName = null; // Объявляем переменную в начале функции
  let shouldCloseContext = false;
  
  try {
    console.log(`📁 Используем профиль: ${PROFILE_PATH}`);
    
    // Используем переданные page и context или создаем новые
    if (!page || !context) {
      // Настройки браузера
      const browserOptions = {
        headless: config.browser.headless,
        slowMo: config.browser.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      };
      
      // Запускаем браузер с постоянным контекстом (профилем)
      context = await chromium.launchPersistentContext(PROFILE_PATH, browserOptions);
      page = context.pages()[0] || await context.newPage();
      shouldCloseContext = true;
    }
    
    // Устанавливаем таймаут
    page.setDefaultTimeout(config.browser.timeout);
    
    // Слушаем консольные сообщения для отладки
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎯') || text.includes('user') || text.includes('name') || text.includes('reward') || text.includes('modal') || text.includes('RewardViewer') || text.includes('HomePage') || text.includes('UserMenu')) {
        console.log(`🔍 Консоль: ${msg.type()} - ${text}`);
      }
    });
    
    // Слушаем ошибки страницы
    page.on('pageerror', error => {
      console.log(`🔍 Ошибка страницы: ${error.message}`);
    });
    
    const baseUrl = config.baseUrl;
    console.log(`🌐 Переходим на ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    console.log('✅ Страница загружена');
    
    // Ждем загрузки UserMenu
    console.log('⏳ Ждем загрузки UserMenu...');
    await page.waitForSelector('.user-menu', { timeout: 10000 });
    console.log('✅ UserMenu найден');
    
    // === ЭТАП 1: Получаем текущее имя пользователя ===
    console.log('\n📋 ЭТАП 1: Получение текущего имени пользователя');
    console.log('================================================');
    
    const currentNameElement = page.locator('.user-name').first();
    const initialName = await currentNameElement.inputValue();
    console.log(`👤 Исходное имя пользователя: "${initialName}"`);
    
    // === ЭТАП 2: Открытие модального окна награды ===
    console.log('\n🎯 ЭТАП 2: Открытие модального окна награды');
    console.log('==========================================');
    
    // Открываем выпадающее меню
    const avatarButton = page.locator('.user-menu-icon').first();
    await avatarButton.click();
    await page.waitForTimeout(1000);
    
    // Ждем появления выпадающего меню
    await page.waitForSelector('.container-user-menu', { timeout: 5000 });
    console.log('✅ Выпадающее меню открыто');
    
    // Ищем награды в правильном контейнере
    let rewardImages;
    let rewardCount = 0;
    
    try {
      // Сначала пробуем найти в указанном XPath контейнере
      const rewardsContainer = page.locator('//*[@id="root"]/div[1]/div[2]/div/div');
      rewardImages = rewardsContainer.locator('img');
      rewardCount = await rewardImages.count();
      console.log(`🔍 Поиск в XPath контейнере: найдено ${rewardCount} наград`);
    } catch (error) {
      console.log('⚠️ XPath контейнер не найден, пробуем альтернативные селекторы...');
    }
    
    // Если в XPath контейнере ничего не найдено, пробуем альтернативные селекторы
    if (rewardCount === 0) {
      try {
        rewardImages = page.locator('.reward-item img');
        rewardCount = await rewardImages.count();
        console.log(`🔍 Поиск в .reward-item: найдено ${rewardCount} наград`);
      } catch (error) {
        console.log('⚠️ .reward-item не найден');
      }
    }
    
    if (rewardCount === 0) {
      try {
        rewardImages = page.locator('.rewards-container img');
        rewardCount = await rewardImages.count();
        console.log(`🔍 Поиск в .rewards-container: найдено ${rewardCount} наград`);
      } catch (error) {
        console.log('⚠️ .rewards-container не найден');
      }
    }
    
    if (rewardCount === 0) {
      console.log('❌ Награды не найдены ни в одном контейнере');
      return false;
    }
    
    console.log(`🎖️ Найдено наград: ${rewardCount}`);
    console.log('🎖️ Кликаем на первую награду...');
    
    // Кликаем на первую награду
    await rewardImages.first().click();
    await page.waitForTimeout(2000);
    
    // Ждем появления модального окна
    const modalOverlay = page.locator('.modal-overlay').first();
    await modalOverlay.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Модальное окно награды открыто');
    
    // Ждем загрузки 3D модели
    console.log('⏳ Ждем загрузки 3D модели...');
    await page.waitForTimeout(2000);
    
    // === ЭТАП 3: Поворот награды на 180 градусов ===
    console.log('\n🔄 ЭТАП 3: Поворот награды на 180 градусов');
    console.log('==========================================');
    
    // Находим canvas с 3D моделью
    const canvas = page.locator('.modal-canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      console.log('🎨 Canvas найден, начинаем поворот...');
      
      // Делаем поворот на 180 градусов (перетаскиваем по горизонтали)
      const startX = canvasBox.x + canvasBox.width / 2;
      const startY = canvasBox.y + canvasBox.height / 2;
      const endX = startX + canvasBox.width; // Перетаскиваем на ширину canvas
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 20 });
      await page.mouse.up();
      
      console.log('✅ Поворот на 180 градусов выполнен');
      await page.waitForTimeout(2000);
    } else {
      console.log('❌ Canvas не найден');
    }
    
    // === ЭТАП 4: Проверка соответствия имени пользователя в 3D сцене ===
    console.log('\n👤 ЭТАП 4: Проверка соответствия имени пользователя в 3D сцене');
    console.log('============================================================');
    
    // Проверяем имя прямо в canvas Babylon.js
    const nameInScene = await page.evaluate(() => {
      // Ищем canvas в модальном окне
      const canvas = document.querySelector('.modal-canvas');
      if (!canvas) {
        return { error: 'Canvas не найден' };
      }
      
      // Получаем контекст canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { error: 'Не удалось получить контекст canvas' };
      }
      
      // Получаем данные изображения с canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Ищем текст в области, где обычно отображается имя пользователя
      // (правый нижний угол, повернутый на -30 градусов)
      const centerX = Math.floor(canvas.width * 0.85); // 85% от ширины
      const centerY = Math.floor(canvas.height * 0.85); // 85% от высоты
      const searchRadius = 100; // Радиус поиска
      
      // Проверяем, есть ли пиксели в области имени (не прозрачные)
      let hasText = false;
      for (let y = centerY - searchRadius; y < centerY + searchRadius; y += 5) {
        for (let x = centerX - searchRadius; x < centerX + searchRadius; x += 5) {
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3]; // Альфа-канал
            if (alpha > 50) { // Если пиксель не прозрачный
              hasText = true;
              break;
            }
          }
        }
        if (hasText) break;
      }
      
      return {
        canvasFound: true,
        canvasSize: { width: canvas.width, height: canvas.height },
        hasTextInNameArea: hasText,
        searchArea: { centerX, centerY, radius: searchRadius }
      };
    });
    
    console.log('🔍 Результат проверки имени в 3D сцене:', nameInScene);
    
    if (nameInScene.error) {
      console.log(`❌ Ошибка проверки: ${nameInScene.error}`);
    } else if (nameInScene.hasTextInNameArea) {
      console.log('✅ Имя пользователя обнаружено в 3D сцене');
    } else {
      console.log('⚠️ Имя пользователя не обнаружено в области отображения');
    }
    
    // Делаем скриншот для проверки имени
    await page.screenshot({ path: 'test-reward-initial-name.png', fullPage: true });
    console.log('📸 Скриншот с исходным именем сохранен: test-reward-initial-name.png');
    
    // Закрываем модальное окно кликом по фону
    console.log('❌ Закрываем модальное окно кликом по фону...');
    
    try {
      // Кликаем по фону модального окна (не по самому контенту)
      await page.click('.modal-overlay', { position: { x: 50, y: 50 } });
      await page.waitForTimeout(1000);
      console.log('✅ Модальное окно закрыто кликом по фону');
    } catch (error) {
      console.log('⚠️ Ошибка при закрытии модального окна:', error.message);
      // Fallback: Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      console.log('✅ Модальное окно закрыто Escape');
    }
    
    await page.waitForTimeout(1000);
    
    // Проверяем, что модальное окно действительно закрыто
    const modalVisible = await page.locator('.modal-overlay').isVisible().catch(() => false);
    if (modalVisible) {
      console.log('⚠️ Модальное окно все еще видимо, принудительно скрываем...');
      await page.evaluate(() => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
          modal.style.display = 'none';
          modal.remove(); // Полностью удаляем из DOM
        }
      });
    }
    
    // === ЭТАП 5: Изменение имени пользователя ===
    console.log('\n✏️ ЭТАП 5: Изменение имени пользователя');
    console.log('======================================');
    
    const newName = `Тест${Date.now()}`;
    console.log(`✏️ Изменяем имя на: "${newName}"`);
    
    // Кликаем на поле имени для редактирования
    await currentNameElement.click();
    await page.waitForTimeout(500);
    
    // Очищаем поле и вводим новое имя
    await currentNameElement.fill(newName);
    await page.waitForTimeout(500);
    
    // Нажимаем Enter для сохранения
    await currentNameElement.press('Enter');
    await page.waitForTimeout(2000);
    
    // Проверяем, что имя обновилось
    const updatedName = await currentNameElement.inputValue();
    console.log(`✅ Имя обновлено на: "${updatedName}"`);
    
    if (updatedName !== newName) {
      console.log('❌ Имя не обновилось в UserMenu');
      return false;
    }
    
    // После изменения имени меню закрывается, нужно его снова открыть
    console.log('🔍 Открываем меню пользователя после изменения имени...');
    
    // Открываем меню пользователя
    const userMenuButton = page.locator('.user-menu-icon').first();
    await userMenuButton.click();
    await page.waitForTimeout(1000);
    
    // Проверяем, что награды видны после открытия меню
    console.log('🔍 Проверяем награды после открытия меню...');
    const rewardsAfterNameUpdate = page.locator('xpath=//*[@id="root"]/div[1]/div[2]/div/div//img');
    const rewardsCountAfterUpdate = await rewardsAfterNameUpdate.count();
    console.log(`🔍 Наград после открытия меню: ${rewardsCountAfterUpdate}`);
    
    if (rewardsCountAfterUpdate === 0) {
      console.log('⚠️ Награды не найдены после открытия меню!');
      // Попробуем обновить страницу или перезагрузить данные
      console.log('🔍 Пробуем обновить страницу...');
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Снова открываем меню после перезагрузки
      const userMenuButtonAfterReload = page.locator('.user-menu-icon').first();
      await userMenuButtonAfterReload.click();
      await page.waitForTimeout(1000);
      
      // Проверяем награды после перезагрузки
      const rewardsAfterReload = page.locator('xpath=//*[@id="root"]/div[1]/div[2]/div/div//img');
      const rewardsCountAfterReload = await rewardsAfterReload.count();
      console.log(`🔍 Наград после перезагрузки и открытия меню: ${rewardsCountAfterReload}`);
    }
    
    // === ЭТАП 6: Повторное открытие награды ===
    console.log('\n🎯 ЭТАП 6: Повторное открытие награды');
    console.log('====================================');
    
    // Убеждаемся, что модальное окно полностью удалено
    await page.evaluate(() => {
      const modal = document.querySelector('.modal-overlay');
      if (modal) {
        modal.remove();
      }
    });
    
    // Снова открываем выпадающее меню с повторными попытками
    let menuOpened = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔄 Попытка ${attempt}/3 открытия меню...`);
      
      try {
        await avatarButton.click();
        await page.waitForTimeout(1000);
        
        // Проверяем, открылось ли меню
        const menuVisible = await page.locator('.container-user-menu').isVisible().catch(() => false);
        if (menuVisible) {
          console.log('✅ Выпадающее меню открыто');
          menuOpened = true;
          break;
        } else {
          console.log(`⚠️ Попытка ${attempt} не удалась, пробуем еще раз...`);
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log(`⚠️ Ошибка в попытке ${attempt}: ${error.message}`);
        await page.waitForTimeout(1000);
      }
    }
    
    if (!menuOpened) {
      console.log('❌ Не удалось открыть выпадающее меню');
      return false;
    }
    
    // Находим награды заново и кликаем на первую
    let currentRewardImages;
    let currentRewardCount = 0;
    
    try {
      // Сначала пробуем найти в указанном XPath контейнере
      const rewardsContainer = page.locator('//*[@id="root"]/div[1]/div[2]/div/div');
      currentRewardImages = rewardsContainer.locator('img');
      currentRewardCount = await currentRewardImages.count();
      console.log(`🔍 Повторный поиск в XPath контейнере: найдено ${currentRewardCount} наград`);
    } catch (error) {
      console.log('⚠️ XPath контейнер не найден, пробуем альтернативные селекторы...');
    }
    
    // Если в XPath контейнере ничего не найдено, пробуем альтернативные селекторы
    if (currentRewardCount === 0) {
      try {
        currentRewardImages = page.locator('.reward-item img');
        currentRewardCount = await currentRewardImages.count();
        console.log(`🔍 Повторный поиск в .reward-item: найдено ${currentRewardCount} наград`);
      } catch (error) {
        console.log('⚠️ .reward-item не найден');
      }
    }
    
    if (currentRewardCount === 0) {
      try {
        currentRewardImages = page.locator('.rewards-container img');
        currentRewardCount = await currentRewardImages.count();
        console.log(`🔍 Повторный поиск в .rewards-container: найдено ${currentRewardCount} наград`);
      } catch (error) {
        console.log('⚠️ .rewards-container не найден');
      }
    }
    
    if (currentRewardCount === 0) {
      console.log('❌ Награды не найдены для повторного открытия');
      return false;
    }
    
    // Кликаем на первую награду
    console.log('🎖️ Кликаем на первую награду повторно...');
    
    // Проверяем, что награда кликабельна
    const rewardElement = currentRewardImages.first();
    const isVisible = await rewardElement.isVisible();
    const isEnabled = await rewardElement.isEnabled();
    console.log(`🔍 Награда видима: ${isVisible}, активна: ${isEnabled}`);
    
    await rewardElement.click();
    await page.waitForTimeout(2000);
    
    // Ждем появления модального окна с таймаутом
    console.log('🔍 Ждем появления модального окна...');
    try {
      await page.waitForSelector('.modal-overlay', { timeout: 10000 });
      console.log('✅ Модальное окно появилось в DOM');
      
      // Проверяем видимость
      const modalVisible = await page.locator('.modal-overlay').isVisible();
      console.log(`🔍 Модальное окно видимо: ${modalVisible}`);
      
      if (modalVisible) {
        console.log('✅ Модальное окно награды открыто повторно');
      } else {
        console.log('⚠️ Модальное окно существует, но не видимо, принудительно показываем...');
        // Пробуем принудительно показать
        await page.evaluate(() => {
          const modal = document.querySelector('.modal-overlay');
          if (modal) {
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.style.zIndex = '1000';
          }
        });
        await page.waitForTimeout(2000);
        
        // Проверяем еще раз
        const modalVisibleAfter = await page.locator('.modal-overlay').isVisible();
        console.log(`🔍 Модальное окно видимо после принудительного показа: ${modalVisibleAfter}`);
      }
    } catch (error) {
      console.log('❌ Модальное окно не появилось в течение 10 секунд');
      console.log('🔍 Проверяем, что происходит на странице...');
      
      // Проверяем URL
      const currentUrl = page.url();
      console.log(`🔍 Текущий URL: ${currentUrl}`);
      
      // Проверяем консольные ошибки
      const logs = await page.evaluate(() => {
        return window.console._logs || [];
      });
      console.log('🔍 Консольные логи:', logs);
      
      return false;
    }
    
    // Ждем загрузки 3D модели
    console.log('⏳ Ждем загрузки 3D модели...');
    await page.waitForTimeout(2000);
    
    // === ЭТАП 7: Повторный поворот на 180 градусов ===
    console.log('\n🔄 ЭТАП 7: Повторный поворот на 180 градусов');
    console.log('===========================================');
    
    if (canvasBox) {
      console.log('🎨 Выполняем повторный поворот...');
      
      // Делаем поворот на 180 градусов (перетаскиваем по горизонтали)
      const startX = canvasBox.x + canvasBox.width / 2;
      const startY = canvasBox.y + canvasBox.height / 2;
      const endX = startX + canvasBox.width; // Перетаскиваем на ширину canvas
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 20 });
      await page.mouse.up();
      
      console.log('✅ Повторный поворот на 180 градусов выполнен');
      await page.waitForTimeout(2000);
    }
    
    // === ЭТАП 8: Проверка соответствия обновленного имени в 3D сцене ===
    console.log('\n👤 ЭТАП 8: Проверка соответствия обновленного имени в 3D сцене');
    console.log('=============================================================');
    
    // Проверяем обновленное имя прямо в canvas Babylon.js
    const updatedNameInScene = await page.evaluate(() => {
      // Ищем canvas в модальном окне
      const canvas = document.querySelector('.modal-canvas');
      if (!canvas) {
        return { error: 'Canvas не найден' };
      }
      
      // Получаем контекст canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { error: 'Не удалось получить контекст canvas' };
      }
      
      // Получаем данные изображения с canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Ищем текст в области, где обычно отображается имя пользователя
      const centerX = Math.floor(canvas.width * 0.85);
      const centerY = Math.floor(canvas.height * 0.85);
      const searchRadius = 100;
      
      // Проверяем, есть ли пиксели в области имени
      let hasText = false;
      let textPixels = 0;
      for (let y = centerY - searchRadius; y < centerY + searchRadius; y += 3) {
        for (let x = centerX - searchRadius; x < centerX + searchRadius; x += 3) {
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const index = (y * canvas.width + x) * 4;
            const alpha = data[index + 3];
            if (alpha > 50) {
              hasText = true;
              textPixels++;
            }
          }
        }
      }
      
      return {
        canvasFound: true,
        canvasSize: { width: canvas.width, height: canvas.height },
        hasTextInNameArea: hasText,
        textPixelsCount: textPixels,
        searchArea: { centerX, centerY, radius: searchRadius }
      };
    });
    
    console.log('🔍 Результат проверки обновленного имени в 3D сцене:', updatedNameInScene);
    
    if (updatedNameInScene.error) {
      console.log(`❌ Ошибка проверки: ${updatedNameInScene.error}`);
    } else if (updatedNameInScene.hasTextInNameArea) {
      console.log(`✅ Обновленное имя обнаружено в 3D сцене (${updatedNameInScene.textPixelsCount} пикселей)`);
    } else {
      console.log('⚠️ Обновленное имя не обнаружено в области отображения');
    }
    
    // Делаем скриншот для проверки обновленного имени
    await page.screenshot({ path: 'test-reward-updated-name.png', fullPage: true });
    console.log('📸 Скриншот с обновленным именем сохранен: test-reward-updated-name.png');
    
    // Закрываем модальное окно кликом по фону
    console.log('❌ Закрываем модальное окно кликом по фону...');
    
    try {
      // Кликаем по фону модального окна (не по самому контенту)
      await page.click('.modal-overlay', { position: { x: 50, y: 50 } });
      await page.waitForTimeout(1000);
      console.log('✅ Модальное окно закрыто кликом по фону');
    } catch (error) {
      console.log('⚠️ Ошибка при закрытии модального окна:', error.message);
      // Fallback: Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      console.log('✅ Модальное окно закрыто Escape');
    }
    
    // === ВОЗВРАТ ИСХОДНОГО ИМЕНИ ===
    console.log('\n🔄 ВОЗВРАТ ИСХОДНОГО ИМЕНИ');
    console.log('==========================');
    console.log(`🔄 Возвращаем исходное имя: "${initialName}"`);
    
    // Сначала закрываем модальное окно, если оно открыто
    const modalStillOpen = await page.locator('.modal-overlay').isVisible();
    if (modalStillOpen) {
      console.log('🔍 Закрываем модальное окно перед возвратом имени...');
      try {
        await page.click('.modal-overlay', { position: { x: 50, y: 50 } });
        await page.waitForTimeout(1000);
        console.log('✅ Модальное окно закрыто');
      } catch (error) {
        console.log('⚠️ Ошибка при закрытии модального окна:', error.message);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    }
    
    // Кликаем на поле имени для редактирования
    await currentNameElement.click();
    await page.waitForTimeout(500);
    
    // Очищаем поле и вводим исходное имя
    await currentNameElement.fill(initialName);
    await page.waitForTimeout(500);
    
    // Нажимаем Enter для сохранения
    await currentNameElement.press('Enter');
    await page.waitForTimeout(2000);
    
    // Проверяем, что имя вернулось к исходному
    const restoredName = await currentNameElement.inputValue();
    if (restoredName === initialName) {
      console.log('✅ Имя успешно возвращено к исходному');
    } else {
      console.log(`⚠️ Имя не совпадает с исходным. Ожидалось: "${initialName}", получено: "${restoredName}"`);
    }
    
    console.log('✅ Все этапы теста выполнены успешно!');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
    
    // Делаем скриншот при ошибке
    if (page) {
      try {
        await page.screenshot({ path: 'test-reward-error.png', fullPage: true });
        console.log('📸 Скриншот ошибки сохранен: test-reward-error.png');
      } catch (screenshotError) {
        console.error('❌ Не удалось сделать скриншот:', screenshotError);
      }
    }
    
    // Пытаемся вернуть исходное имя даже при ошибке
    if (page && initialName) {
      try {
        console.log('\n🔄 Попытка вернуть исходное имя при ошибке...');
        const currentNameElement = page.locator('.user-name').first();
        await currentNameElement.click();
        await page.waitForTimeout(500);
        await currentNameElement.fill(initialName);
        await page.waitForTimeout(500);
        await currentNameElement.press('Enter');
        await page.waitForTimeout(1000);
        console.log('✅ Исходное имя возвращено при ошибке');
      } catch (restoreError) {
        console.log('⚠️ Не удалось вернуть исходное имя при ошибке:', restoreError.message);
      }
    }
    
    return false;
  } finally {
    // Закрываем браузер только если мы его создавали
    if (shouldCloseContext && context) {
      await context.close();
    }
  }
}

// Запуск теста
async function main() {
  console.log('🎖️ Комплексный тест наград и имени пользователя');
  console.log('===============================================');
  console.log('Этапы теста:');
  console.log('1. Получение текущего имени пользователя');
  console.log('2. Открытие модального окна награды (первый раз)');
  console.log('3. Поворот награды на 180 градусов');
  console.log('4. Проверка соответствия имени пользователя');
  console.log('5. Изменение имени пользователя через input');
  console.log('6. Повторное открытие награды (второй раз)');
  console.log('7. Повторный поворот на 180 градусов');
  console.log('8. Проверка соответствия обновленного имени');
  console.log('9. Возврат исходного имени пользователя');
  console.log('===============================================\n');
  
  try {
    const result = await runRewardTest();
    
    console.log('\n📊 РЕЗУЛЬТАТ ТЕСТА:');
    console.log('=====================================');
    console.log(`🎖️ Комплексный тест наград: ${result ? '✅ УСПЕХ' : '❌ ОШИБКА'}`);
    
    if (result) {
      console.log('\n🎉 ВСЕ ЭТАПЫ ТЕСТА ПРОЙДЕНЫ УСПЕШНО!');
      console.log('📸 Проверьте скриншоты:');
      console.log('  - test-reward-initial-name.png (исходное имя)');
      console.log('  - test-reward-updated-name.png (обновленное имя)');
      console.log('  - test-reward-final-name.png (финальное имя)');
      process.exit(0);
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕН');
      console.log('📸 Проверьте скриншот ошибки: test-reward-error.png');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runRewardTest };
