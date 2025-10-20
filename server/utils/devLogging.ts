// Простое dev-логирование
export const initDevLogging = () => {
  console.log('🔧 Dev-логирование активировано');
  
  // Перехватываем console для форматирования
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  // Цвета для разных типов логов
  const colors = {
    log: '\x1b[36m',    // cyan
    warn: '\x1b[33m',   // yellow
    error: '\x1b[31m',  // red
    info: '\x1b[32m',   // green
    debug: '\x1b[35m'   // magenta
  };

  const reset = '\x1b[0m';

  // Функция для форматирования сообщений
  function formatMessage(level: string, args: any[]): string {
    const time = new Date().toLocaleTimeString('ru-RU', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    const color = colors[level as keyof typeof colors] || '';
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    return `${color}${message}${reset}`;
  }

  // Перехватываем console методы
  console.log = (...args: any[]) => {
    const formatted = formatMessage('log', args);
    originalConsole.log(formatted);
  };

  console.warn = (...args: any[]) => {
    const formatted = formatMessage('warn', args);
    originalConsole.warn(formatted);
  };

  console.error = (...args: any[]) => {
    const formatted = formatMessage('error', args);
    originalConsole.error(formatted);
  };

  console.info = (...args: any[]) => {
    const formatted = formatMessage('info', args);
    originalConsole.info(formatted);
  };

  console.debug = (...args: any[]) => {
    const formatted = formatMessage('debug', args);
    originalConsole.debug(formatted);
  };
};
