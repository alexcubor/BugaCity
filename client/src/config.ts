// Конфигурация для клиентского приложения
export const config = {
  // Mapbox токен для карт
  mapboxToken: 'pk.eyJ1IjoiYWxleGN1Ym9yIiwiYSI6ImNtZ2MyendmYTE2NnIya3IwaWdjcTdwd20ifQ.lHoZI2LuqkukgCq6i7PupQ',
  
  // Yandex OAuth ID
  yandexClientId: '03e35996472d40e3b0d980943e545cb8',
  
  // VK OAuth ID
  vkClientId: '54075494',
  
  // API URL
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://gluko.city/api' 
    : 'http://localhost:3001/api'
};

export default config;
