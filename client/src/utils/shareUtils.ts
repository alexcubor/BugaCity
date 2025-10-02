// Утилиты для работы с функцией "Поделиться"

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

/**
 * Проверяет, является ли устройство мобильным
 */
export const isMobileDevice = (): boolean => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Проверяет, поддерживает ли браузер Web Share API
 */
export const supportsWebShare = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

/**
 * Пытается поделиться через нативное меню, если доступно
 * @param shareData - данные для шаринга
 * @returns Promise<boolean> - true если успешно поделились, false если нужно использовать fallback
 */
export const tryNativeShare = async (shareData: ShareData): Promise<boolean> => {
  if (supportsWebShare() && isMobileDevice()) {
    try {
      await navigator.share(shareData);
      return true; // Успешно поделились через нативное меню
    } catch (error) {
      // Пользователь отменил или произошла ошибка
      console.log('Web Share отменён или ошибка:', error);
      return false;
    }
  }
  return false;
};

/**
 * Копирует текст в буфер обмена с fallback для старых браузеров
 * @param text - текст для копирования
 * @returns Promise<boolean> - true если успешно скопировали
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback для старых браузеров
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      console.error('Не удалось скопировать в буфер обмена:', fallbackError);
      return false;
    }
  }
};
