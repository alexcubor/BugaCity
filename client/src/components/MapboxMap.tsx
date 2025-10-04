import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapboxMap.css';

interface MapboxMapProps {
  className?: string;
  style?: React.CSSProperties;
  center?: [number, number];
  zoom?: number;
  onMapLoad?: (map: mapboxgl.Map) => void;
  showControls?: boolean;
  customStyle?: string | mapboxgl.Style;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  className = '',
  style = {},
  center = [37.6176, 55.7558], // Москва по умолчанию
  zoom = 10,
  onMapLoad,
  showControls = true,
  customStyle
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');

  // Функция для получения геолокации пользователя
  const getUserLocation = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается браузером'));
        return;
      }

      console.log('Запрашиваем геолокацию...');
      console.log('Настройки:', {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });

      // Проверяем разрешения (если поддерживается)
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            console.log('Статус разрешения геолокации:', result.state);
            if (result.state === 'denied') {
              console.warn('Геолокация заблокирована пользователем');
            }
          })
          .catch((err) => {
            console.log('Не удалось проверить разрешения:', err);
          });
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude, accuracy } = position.coords;
          console.log('Геолокация получена:', {
            longitude,
            latitude,
            accuracy: `${accuracy}м`,
            timestamp: new Date(position.timestamp).toLocaleString()
          });
          resolve([longitude, latitude]);
        },
        (error) => {
          let errorMessage = 'Неизвестная ошибка геолокации';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Доступ к геолокации запрещен пользователем';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Информация о местоположении недоступна';
              break;
            case error.TIMEOUT:
              errorMessage = 'Время ожидания геолокации истекло';
              break;
          }
          console.warn('Ошибка получения геолокации:', errorMessage);
          console.warn('Детали ошибки:', {
            code: error.code,
            message: error.message,
            timestamp: new Date().toLocaleString()
          });
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Увеличиваем таймаут до 15 секунд
          maximumAge: 0 // Отключаем кэширование для тестирования
        }
      );
    });
  };

  useEffect(() => {
    // Получаем токен из переменных окружения
    const token = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiYWxleGN1Ym9yIiwiYSI6ImNtZ2MyendmYTE2NnIya3IwaWdjcTdwd20ifQ.lHoZI2LuqkukgCq6i7PupQ';
    
    console.log('🗺️ MapboxMap: Инициализация карты');
    console.log('🗺️ MapboxMap: Токен:', token ? `${token.substring(0, 20)}...` : 'НЕ НАЙДЕН');
    console.log('🗺️ MapboxMap: Контейнер:', mapContainer.current ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
    
    if (!mapContainer.current) {
      console.error('🗺️ MapboxMap: Контейнер карты не найден!');
      return;
    }

    // Получаем геолокацию пользователя
    getUserLocation()
      .then((location) => {
        setUserLocation(location);
        setLocationStatus('success');
        // Инициализируем карту с геолокацией пользователя
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          accessToken: token,
          style: customStyle || 'mapbox://styles/mapbox/streets-v12',
          center: location,
          zoom: 15, // Ближе к пользователю
          attributionControl: true
        });
        initializeMap();
      })
      .catch((error) => {
        // Если геолокация не удалась, используем центр по умолчанию
        setLocationStatus('error');
        console.log('Геолокация недоступна, используем центр по умолчанию (Москва)');
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          accessToken: token,
          style: customStyle || 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: zoom,
          attributionControl: true
        });
        initializeMap();
      });
  }, []);

  const initializeMap = () => {
    console.log('🗺️ MapboxMap: initializeMap вызван');
    if (!map.current) {
      console.error('🗺️ MapboxMap: map.current не найден в initializeMap!');
      return;
    }

    console.log('🗺️ MapboxMap: Настраиваем обработчики событий');

    // Обработчики событий
    map.current.on('load', () => {
      console.log('🗺️ MapboxMap: Карта загружена успешно!');
      
      setIsLoading(false);
      if (onMapLoad) {
        onMapLoad(map.current!);
      }
    });

    map.current.on('error', (e) => {
      console.error('🗺️ MapboxMap: Ошибка карты:', e);
      setError('Ошибка загрузки карты');
      setIsLoading(false);
    });
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Обновляем центр и зум при изменении пропсов
  useEffect(() => {
    if (map.current) {
      map.current.setCenter(center);
      map.current.setZoom(zoom);
    }
  }, [center, zoom]);


  console.log('🗺️ MapboxMap: Рендерим компонент', { isLoading, error, userLocation, locationStatus });

  return (
    <div className={`mapbox-map-container ${className}`} style={style}>
      {error && (
        <div className="mapbox-error">
          <p>{error}</p>
        </div>
      )}
      
      <div 
        ref={mapContainer} 
        className="mapbox-map"
        style={{ 
          width: '100%', 
          height: '100%'
        }}
      />
    </div>
  );
};

export default MapboxMap;
