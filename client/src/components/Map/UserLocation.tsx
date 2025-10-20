import React, { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface UserLocationProps {
  map: mapboxgl.Map | null;
  isUserLoggedIn: boolean;
  user?: any;
  onLocationChange?: (location: [number, number] | null) => void;
  onUserClick?: () => void;
}

const UserLocation: React.FC<UserLocationProps> = ({ map, isUserLoggedIn, user, onLocationChange, onUserClick }) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number>(0);
  const [hasFocusedOnUser, setHasFocusedOnUser] = useState<boolean>(false);

  //

  // Функция для получения геолокации пользователя
  const getUserLocation = (): Promise<{ coordinates: [number, number], accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается браузером'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude, accuracy } = position.coords;
          const coordinates: [number, number] = [longitude, latitude];
          
          // Отправляем координаты на сервер, если пользователь авторизован
          if (isUserLoggedIn) {
            updateLocationOnServer(coordinates, accuracy);
          }
          
          resolve({ coordinates, accuracy });
        },
        (error) => {
          // Если точная геолокация недоступна, используем координаты компьютера/провайдера
          const fallbackCoordinates: [number, number] = [37.6176, 55.7558]; // Москва как fallback
          
          // Отправляем координаты на сервер, если пользователь авторизован
          if (isUserLoggedIn) {
            updateLocationOnServer(fallbackCoordinates, 10000); // Большая погрешность для fallback
          }
          
          resolve({ coordinates: fallbackCoordinates, accuracy: 10000 });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  };

  // Функция для обновления местоположения на сервере
  const updateLocationOnServer = async (coordinates: [number, number], accuracy: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/users/me/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coordinates,
          accuracy,
          isActive: true
        })
      });

      if (!response.ok) {
        // Ошибка обновления местоположения
      }
    } catch (error) {
      console.error('❌ Ошибка отправки местоположения:', error);
    }
  };

  //

  // Инициализация геолокации при авторизации
  useEffect(() => {
    if (isUserLoggedIn && map) {
      setTimeout(() => {
        getUserLocation()
          .then(({ coordinates, accuracy }) => {
            setUserLocation(coordinates);
            setUserAccuracy(accuracy);
          })
          .catch((error) => {
            console.log('❌ Ошибка получения геолокации:', error.message);
          });
      }, 500);
    }
  }, [isUserLoggedIn, map]);

  // Добавление маркера при получении геолокации
  useEffect(() => {
    if (userLocation && map && isUserLoggedIn) {
      // Уведомляем родительский компонент об изменении местоположения
      if (onLocationChange) {
        onLocationChange(userLocation);
      }
      setTimeout(() => {
        // Фокусируемся на пользователе только один раз при первом получении геолокации
        if (!hasFocusedOnUser) {
          map.flyTo({
            center: userLocation,
            zoom: 16,
            duration: 2000,
            essential: true
          });
          setHasFocusedOnUser(true);
        }
      }, 100);
    }
  }, [userLocation, userAccuracy, map, isUserLoggedIn, hasFocusedOnUser, onLocationChange]);

  // Периодическое обновление геолокации
  useEffect(() => {
    if (!isUserLoggedIn || !map) return;

    let consecutiveErrors = 0;
    const maxErrors = 3;

    const updateLocation = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - (Date.now() - 30000); // Примерное время последнего обновления

      if (timeSinceLastUpdate < 30000) {
        return;
      }

      getUserLocation()
        .then(({ coordinates, accuracy }) => {
          setUserLocation(coordinates);
          setUserAccuracy(accuracy);
          consecutiveErrors = 0;
        })
        .catch((error) => {
          consecutiveErrors++;
          console.log(`Ошибка обновления геолокации (${consecutiveErrors}/${maxErrors}):`, error.message);
          
          if (consecutiveErrors >= maxErrors) {
            console.log('❌ Слишком много ошибок геолокации, останавливаем обновления');
            return;
          }
        });
    };

    // Обновляем геолокацию каждые 30 секунд
    const interval = setInterval(updateLocation, 30000);

    return () => clearInterval(interval);
  }, [isUserLoggedIn, map]);

  //

  return (
    null
  );
};

export default UserLocation;
