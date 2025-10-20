import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapContainer.css';
import config from '../../config';

interface MapContainerProps {
  className?: string;
  style?: React.CSSProperties;
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
  onMapReady?: (map: mapboxgl.Map) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({
  className = '',
  style,
  center,
  zoom = 10,
  children,
  onMapReady
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Инициализация карты
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center || [37.6176, 55.7558], // Москва по умолчанию
      zoom: zoom,
      accessToken: config.mapboxToken,
      attributionControl: false,
      logoPosition: 'bottom-right',
      maxZoom: 22,
      minZoom: 1
    });

    // Скрываем все элементы управления, кроме логотипа, после загрузки
    map.current.on('load', () => {
      // Скрываем все элементы управления
      const allControls = mapContainer.current?.querySelectorAll('.mapboxgl-ctrl');
      allControls?.forEach(control => {
        if (!control.classList.contains('mapboxgl-ctrl-logo')) {
          (control as HTMLElement).style.display = 'none';
        }
      });
      
      // Принудительно показываем логотип
      const logo = mapContainer.current?.querySelector('.mapboxgl-ctrl-logo');
      if (logo) {
        (logo as HTMLElement).style.display = 'block';
      }
    });

    // Обработчики событий карты
    map.current.on('load', () => {
      // Скрываем все лейблы (надписи) на карте
      if (map.current) {
        const style = map.current.getStyle();
        if (style && style.layers) {
          style.layers.forEach((layer: any) => {
            if (layer.type === 'symbol' || layer.layout?.['text-field']) {
              map.current!.setLayoutProperty(layer.id, 'visibility', 'none');
            }
          });
        }
      }
      
      // Принудительно обновляем размеры карты
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 100);
      
      setIsLoading(false);
      setMapReady(true);
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });

    map.current.on('error', (e) => {
      setError('Ошибка загрузки карты');
      setIsLoading(false);
    });

    // Обработчик изменения размера окна
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Очистка при размонтировании
    return () => {
      window.removeEventListener('resize', handleResize);
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Обновляем центр и зум при изменении пропсов
  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 2000,
        essential: true
      });
    }
  }, [center, zoom]);

  if (error) {
    return (
      <div className={`mapbox-map-container ${className}`} style={style}>
        <div className="map-error">
          <p>Ошибка загрузки карты: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mapbox-map-container ${className}`} style={style}>
      <div ref={mapContainer} className="mapbox-map" />
      
      {/* Надпись о строительстве */}
      <div className="construction-notice">
        Строительство вовсю идёт...<br />
        Скоро здесь появятся новые активности!
      </div>
      
      {isLoading && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка карты...</p>
        </div>
      )}
      {mapReady && children}
    </div>
  );
};

export default MapContainer;

