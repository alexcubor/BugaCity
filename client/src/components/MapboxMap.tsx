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
  const [craneAdded, setCraneAdded] = useState(false);

  // Функция для добавления маркера крана через Mapbox GL JS API
  const addCraneMarker = (coordinates: [number, number]) => {
    if (!map.current || craneAdded) return;

    console.log('🏗️ Добавление маркера крана через Mapbox GL JS API:', coordinates);

    // Загружаем изображение крана
    map.current.loadImage('/images/construction_crane.png', (error, image) => {
      if (error) {
        console.error('❌ Ошибка загрузки изображения крана:', error);
        return;
      }

      console.log('✅ Изображение крана загружено:', image);
      console.log('📏 Размер изображения:', image ? `${image.width}x${image.height}` : 'неизвестно');

      // Добавляем изображение в карту
      if (image) {
        map.current!.addImage('crane-icon', image);
        console.log('✅ Изображение добавлено в карту как "crane-icon"');
      } else {
        console.error('❌ Изображение не загружено');
        return;
      }

      // Добавляем источник данных
      map.current!.addSource('crane-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: coordinates
              },
              properties: {
                title: 'Ведутся работы',
                description: 'Строительные работы в процессе'
              }
            }
          ]
        }
      });

      // Добавляем слой для иконки (маленький размер)
      map.current!.addLayer({
        id: 'crane-icon-layer',
        type: 'symbol',
        source: 'crane-source',
        layout: {
          'icon-image': 'crane-icon',
          'icon-size': 0.3, // Еще меньше размер иконки
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'left' // Привязываем к левому краю
        }
      });

      // Добавляем отдельный источник для заголовка
      map.current!.addSource('crane-title-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: coordinates
              },
              properties: {
                title: 'Ведутся работы'
              }
            }
          ]
        }
      });

      // Добавляем отдельный источник для подзаголовка
      map.current!.addSource('crane-subtitle-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: coordinates
              },
              properties: {}
            }
          ]
        }
      });

      // Добавляем слой для заголовка (крупный размер)
      map.current!.addLayer({
        id: 'crane-title-layer',
        type: 'symbol',
        source: 'crane-title-source',
        layout: {
          'text-field': 'Ведутся работы',
          'text-size': 40, // В два раза крупнее (20 * 2 = 40)
          'text-offset': [0.8, -0.8], // Отступ от иконки и выше
          'text-anchor': 'left',
          'text-justify': 'left',
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#333',
          'text-halo-color': '#fff',
          'text-halo-width': 4 // Обводка для заголовка
        }
      });

      // Добавляем слой для подзаголовка (обычный размер)
      map.current!.addLayer({
        id: 'crane-subtitle-layer',
        type: 'symbol',
        source: 'crane-subtitle-source',
        layout: {
          'text-field': 'Скоро здесь появятся новые активности!',
          'text-size': 16, // Обычный размер текста
          'text-offset': [2.2, 1.8], // Отступ от иконки и ниже заголовка
          'text-anchor': 'left',
          'text-justify': 'left',
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#1a1a1a', // Темный цвет (90% черного)
          'text-halo-color': '#fff',
          'text-halo-width': 2 // Обводка для подзаголовка
        }
      });

      setCraneAdded(true);
      console.log('✅ Маркер крана добавлен через Mapbox GL JS API');
    });
  };

  // Функция для получения геолокации пользователя
  const getUserLocation = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается браузером'));
        return;
      }


      // Проверяем разрешения (если поддерживается)
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then((result) => {
            // Разрешения проверены
          })
          .catch((err) => {
            // Не удалось проверить разрешения
          });
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude, accuracy } = position.coords;
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
    
    console.log('🗺️ Инициализация карты Mapbox...');
    console.log('🔑 Токен:', token ? 'найден' : 'не найден');
    console.log('📍 Центр по умолчанию:', center);
    console.log('🔍 Зум по умолчанию:', zoom);
    
    if (!mapContainer.current) {
      console.error('❌ Контейнер карты не найден');
      return;
    }

    // Проверяем, не создана ли уже карта
    if (map.current) {
      console.log('⚠️ Карта уже существует, пропускаем создание');
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
          attributionControl: false
        });
        initializeMap();
      })
      .catch((error) => {
        // Если геолокация не удалась, используем центр по умолчанию
        setLocationStatus('error');
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          accessToken: token,
          style: customStyle || 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: zoom,
          attributionControl: false
        });
        initializeMap();
      });
  }, []); // Убираем зависимости, чтобы карта создавалась только один раз

  const initializeMap = () => {
    if (!map.current) {
      return;
    }

    // Обработчики событий
    map.current.on('load', () => {
      console.log('✅ Карта Mapbox загружена успешно');
      
      // Скрываем все текстовые слои (надписи городов, улиц и т.д.)
      const style = map.current!.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer: any) => {
          if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
            // Скрываем текстовые слои
            map.current!.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        });
      }
      
      // Скрываем контейнер с логотипом
      const bottomLeftContainer = document.querySelector('.mapboxgl-ctrl-bottom-left');
      if (bottomLeftContainer) {
        (bottomLeftContainer as HTMLElement).style.display = 'none';
      }
      
      // Добавляем маркер крана в левую часть экрана
      const mapCenter = map.current!.getCenter();
      const mapBounds = map.current!.getBounds();
      
      if (!mapBounds) {
        console.error('❌ Не удалось получить границы карты');
        return;
      }
      
      // Вычисляем координаты для левой части экрана (примерно 25% от левого края)
      const leftOffset = (mapBounds.getEast() - mapBounds.getWest()) * 0.25;
      const craneCoordinates: [number, number] = [mapBounds.getWest() + leftOffset, mapCenter.lat];
      
      console.log('🏗️ Центр карты:', mapCenter);
      console.log('🏗️ Границы карты:', mapBounds);
      console.log('🏗️ Координаты для маркера (левая часть):', craneCoordinates);
      
      // Добавляем маркер через Mapbox GL JS API
      addCraneMarker(craneCoordinates);
      
      setIsLoading(false);
      if (onMapLoad) {
        onMapLoad(map.current!);
      }
    });

    map.current.on('error', (e) => {
      console.error('❌ Ошибка загрузки карты Mapbox:', e);
      setError('Ошибка загрузки карты');
      setIsLoading(false);
    });

    // Добавляем дополнительные обработчики для диагностики
    map.current.on('style.load', () => {
      console.log('🎨 Стиль карты загружен');
    });

  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (map.current) {
        // Удаляем слои и источники крана
        if (map.current.getLayer('crane-subtitle-layer')) {
          map.current.removeLayer('crane-subtitle-layer');
        }
        if (map.current.getLayer('crane-title-layer')) {
          map.current.removeLayer('crane-title-layer');
        }
        if (map.current.getLayer('crane-icon-layer')) {
          map.current.removeLayer('crane-icon-layer');
        }
        if (map.current.getSource('crane-subtitle-source')) {
          map.current.removeSource('crane-subtitle-source');
        }
        if (map.current.getSource('crane-title-source')) {
          map.current.removeSource('crane-title-source');
        }
        if (map.current.getSource('crane-source')) {
          map.current.removeSource('crane-source');
        }
        if (map.current.hasImage('crane-icon')) {
          map.current.removeImage('crane-icon');
        }
        map.current.remove();
      }
    };
  }, []);

  // Обновляем центр и зум при изменении пропсов
  useEffect(() => {
    if (map.current) {
      map.current.setCenter(center);
      map.current.setZoom(zoom);
      
      // Обновляем позицию маркера крана при изменении центра (всегда в левой части)
      if (craneAdded && map.current.getSource('crane-source') && map.current.getSource('crane-title-source') && map.current.getSource('crane-subtitle-source')) {
        const mapBounds = map.current.getBounds();
        if (!mapBounds) return;
        
        const leftOffset = (mapBounds.getEast() - mapBounds.getWest()) * 0.25;
        const craneCoordinates: [number, number] = [mapBounds.getWest() + leftOffset, center[1]];
        
        // Обновляем источник иконки
        const iconSource = map.current.getSource('crane-source') as mapboxgl.GeoJSONSource;
        iconSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: craneCoordinates
              },
              properties: {
                title: 'Ведутся работы',
                description: 'Строительные работы в процессе'
              }
            }
          ]
        });

        // Обновляем источник заголовка
        const titleSource = map.current.getSource('crane-title-source') as mapboxgl.GeoJSONSource;
        titleSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: craneCoordinates
              },
              properties: {
                title: 'Ведутся работы'
              }
            }
          ]
        });

        // Обновляем источник подзаголовка
        const subtitleSource = map.current.getSource('crane-subtitle-source') as mapboxgl.GeoJSONSource;
        subtitleSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: craneCoordinates
              },
              properties: {}
            }
          ]
        });
      }
    }
  }, [center, zoom, craneAdded]);



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
