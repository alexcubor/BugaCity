import React, { useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapContainer from './MapContainer';
import UserLocation from './UserLocation';

interface MapProps {
  className?: string;
  style?: React.CSSProperties;
  isUserLoggedIn: boolean;
  user?: any;
  onUserClick?: () => void;
}

const Map: React.FC<MapProps> = ({
  className = '',
  style,
  isUserLoggedIn,
  user,
  onUserClick
}) => {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Получаем ссылку на карту из MapContainer
  const handleMapReady = (mapInstance: mapboxgl.Map) => {
    setMap(mapInstance);
    setMapReady(true);
  };

  // Обработчик изменения местоположения пользователя
  const handleLocationChange = (location: [number, number] | null) => {
    setUserLocation(location);
  };

  return (
    <MapContainer
      className={className}
      style={style}
      onMapReady={handleMapReady}
    >
        {mapReady && map && (
          <>
            <UserLocation
              map={map}
              isUserLoggedIn={isUserLoggedIn}
              user={user}
              onLocationChange={handleLocationChange}
              onUserClick={onUserClick}
            />
            {/* Друзья на карте удалены */}
          </>
        )}
    </MapContainer>
  );
};

// Экспортируем все компоненты
export { Map, MapContainer, UserLocation };
