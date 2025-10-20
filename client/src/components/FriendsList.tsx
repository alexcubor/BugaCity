import React, { useState, useEffect } from 'react';
import './FriendsList.css';

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  location?: {
    coordinates: [number, number];
    isActive: boolean;
    lastUpdated: string;
  };
}

interface FriendsListProps {
  isUserLoggedIn: boolean;
  userId?: string;
}

const FriendsList: React.FC<FriendsListProps> = ({ isUserLoggedIn, userId }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  const showCopyNotification = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000); // Скрываем через 3 секунды
  };

  const loadFriends = async () => {
    if (!isUserLoggedIn || !userId) {
      setFriends([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFriends([]);
        return;
      }

      const response = await fetch('/api/friends?force=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        console.error('❌ Ошибка загрузки друзей:', response.statusText);
        setError('Ошибка загрузки друзей');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки друзей:', error);
      setError('Ошибка загрузки друзей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, [isUserLoggedIn, userId]);

  // Периодическое обновление списка друзей, чтобы подтягивать свежий online-статус
  useEffect(() => {
    if (!isUserLoggedIn || !userId) return;
    const interval = setInterval(() => {
      loadFriends();
    }, 30000); // каждые 30 секунд
    return () => clearInterval(interval);
  }, [isUserLoggedIn, userId]);

  // Не показываем компонент, если пользователь не авторизован
  if (!isUserLoggedIn) {
    return null;
  }

  // Убираем условие, которое скрывает компонент при отсутствии друзей
  // Кнопка "плюс" должна показываться всегда

  const getInitials = (name: string | undefined): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string | undefined): string => {
    if (!name) return '#CCCCCC';
    // Генерируем цвет на основе имени
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="friends-list">
      <div className="friends-container">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="friend-avatar"
            data-tooltip={friend.name}
          >
            <div style={{ position: 'relative' }}>
              <img 
                src={friend.avatar || '/images/user_icon.svg'} 
                alt={friend.name}
                className="friend-avatar-image"
                style={{ clipPath: `url(#friendMask-${friend.id})` }}
                onError={(e) => {
                  e.currentTarget.src = '/images/user_icon.svg';
                }}
              />
              <svg width="40" height="40" viewBox="0 0 39 39" style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                  <clipPath id={`friendMask-${friend.id}`}>
                    <path d="M19.0791 0.5C22.3838 0.495595 25.6814 0.686394 32.2363 1.06445L34.2129 1.17773C35.1078 1.22935 35.8162 1.26964 36.3672 1.35547C36.9209 1.44175 37.387 1.58363 37.7627 1.88477C38.1573 2.20109 38.3403 2.60326 38.4238 3.0791C38.5019 3.52382 38.5 4.08029 38.5 4.73535V23.2393C38.5 25.0913 38.5007 26.5303 38.3428 27.6943C38.1822 28.8779 37.8533 29.8183 37.1719 30.6689C36.498 31.5099 35.5684 32.1528 34.2842 32.8027C33.0038 33.4507 31.3233 34.1289 29.1221 35.0176L24.123 37.0352C21.785 37.9791 20.4935 38.5101 19.083 38.5C17.672 38.4899 16.3931 37.9402 14.0801 36.9629L9.57715 35.0605C7.44527 34.1598 5.81712 33.4721 4.57715 32.8203C3.33334 32.1665 2.43311 31.5258 1.78223 30.6953C1.12395 29.8553 0.806418 28.931 0.651367 27.7705C0.49894 26.6292 0.5 25.2203 0.5 23.4072V4.72461C0.499999 4.07195 0.498496 3.51757 0.576172 3.07422C0.65934 2.59968 0.84135 2.19797 1.23438 1.88184C1.60858 1.58094 2.07325 1.43896 2.625 1.35156C3.17396 1.26462 3.87899 1.22276 4.77051 1.16895L5.92578 1.09961C12.4785 0.704099 15.7745 0.504414 19.0791 0.5Z" />
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        ))}
        
        {/* Кнопка "плюс" всегда показывается */}
        <button
          type="button"
          className="friends-share-button"
          onClick={async () => {
            const shareData = {
              title: 'Глюкоград',
              text: 'Заскакивай в Глюкоград!',
              url: window.location.origin,
            };
            try {
              if (navigator.share) {
                await navigator.share(shareData as ShareData);
              } else {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                showCopyNotification();
              }
            } catch (e) {
              try {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                showCopyNotification();
              } catch (err) {
                console.error('Share failed', err);
              }
            }
          }}
          aria-label="Поделиться BugaCity"
          title="Пригласить друга"
        >
          +
        </button>
      </div>
      
      {loading && (
        <div className="friends-loading">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      {error && (
        <div className="friends-error">
          <span>⚠️</span>
        </div>
      )}
      
      {/* Уведомление о копировании */}
      {showNotification && (
        <div className="copy-notification">
            <span className="copy-notification-text">Ссылка скопирована! Поделись ею с другом!</span>
        </div>
      )}
    </div>
  );
};

export default FriendsList;
