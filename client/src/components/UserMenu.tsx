import React, { useState, useEffect, Suspense, lazy } from 'react';
import './UserMenu.css';
import './RewardViewer/RewardViewer.css';
import { tryNativeShare, copyToClipboard, ShareData } from '../utils/shareUtils';

// Ленивая загрузка RewardViewer (Babylon.js загрузится только когда открывается награда)
const RewardViewer = lazy(() => import('./RewardViewer'));

interface UserMenuProps {
  onLogout: () => void;
  onRewardClick?: (reward: string) => void;
}

interface User {
  _id: string;
  id: string;
  username: string;
  name: string;
  glukocoins: number;
  rewards: string[];
}

interface Reward {
  id: string;
  name: string;
  description: string;
  price: number;
}

function UserMenu({ onLogout, onRewardClick }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [rewardsData, setRewardsData] = useState<Reward[]>([]);
  
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Загружаем данные пользователя сразу при монтировании компонента
    if (!user) {
      loadUserData();
    }
  }, []);

  // Проверяем URL при загрузке страницы и при изменениях
  useEffect(() => {
    const checkUrlForReward = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const rewardParam = urlParams.get('reward');
      if (rewardParam) {
        setSelectedReward(rewardParam);
        // Загружаем данные пользователя, если есть параметр reward
        loadUserData();
      } else {
        setSelectedReward(null);
      }
    };

    // Проверяем сразу при загрузке
    checkUrlForReward();

    // Слушаем изменения URL
    const handleUrlChange = () => {
      checkUrlForReward();
    };

    // Слушаем pushState и replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleUrlChange, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleUrlChange, 0);
    };

    // Обработчик кнопки "Назад" в браузере
    const handlePopState = () => {
      checkUrlForReward();
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Восстанавливаем оригинальные методы
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.user-menu')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // Получаем ID пользователя из токена (упрощенно - декодируем JWT)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      // Загружаем данные конкретного пользователя
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Загружаем информацию о наградах пользователя
        if (userData.rewards && userData.rewards.length > 0) {
          await loadRewardsData(userData.rewards);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRewardsData = async (rewardIds: string[]) => {
    try {
      const response = await fetch('/api/rewards');
      if (response.ok) {
        const allRewards = await response.json();
        // Фильтруем только те награды, которые есть у пользователя
        const userRewards = allRewards.filter((reward: Reward) => 
          rewardIds.includes(reward.id)
        );
        setRewardsData(userRewards);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных наград:', error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
  };

  const handleRewardClick = (reward: string) => {
    console.log('🎯 UserMenu: handleRewardClick вызван', { reward });
    
    if (onRewardClick) {
      onRewardClick(reward);
    } else {
      // Fallback: локальная логика
      setSelectedReward(reward);
    }
    
    // Обновляем URL с ID пользователя для возможности поделиться ссылкой
    const url = new URL(window.location.href);
    if (user?.id) {
      url.searchParams.set('user', user.id);
      url.searchParams.set('reward', reward);
      window.history.pushState({}, '', url);
      console.log('🎯 UserMenu: URL обновлен с параметрами награды');
    } else {
      console.log('🎯 UserMenu: ID пользователя не найден');
    }
  };

  const closeModal = () => {
    console.log('🎯 UserMenu: closeModal вызван');
    setSelectedReward(null);
    // Убираем параметр из URL
    const url = new URL(window.location.href);
    url.searchParams.delete('reward');
    window.history.pushState({}, '', url);
    console.log('🎯 UserMenu: Модальное окно награды закрыто');
  };

  const getSelectedRewardData = (): Reward | null => {
    if (!selectedReward) return null;
    return rewardsData.find(reward => reward.id === selectedReward) || null;
  };

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleShareClick = async () => {
    if (user?.id && selectedReward) {
      const shareUrl = `${window.location.origin}/?user=${user.id}&reward=${selectedReward}`;
      const shareData: ShareData = {
        title: 'Посмотри мою награду!',
        text: 'Посмотри на эту крутую награду!',
        url: shareUrl
      };

      // Пытаемся использовать нативное меню на мобильных устройствах
      const sharedSuccessfully = await tryNativeShare(shareData);
      
      if (!sharedSuccessfully) {
        // Fallback: копируем в буфер обмена
        const copied = await copyToClipboard(shareUrl);
        if (copied) {
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 3000);
        }
      }
    }
  };


  return (
    <div className="user-menu">
      {/* Кнопка с аватаром */}
      <button className="user-menu-open" onClick={toggleMenu}>
        <span>{user?.name || 'Пользователь'}</span>
        {user?.id ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={`/uploads/users/${user.id.substring(0, 8).padStart(8, '0')}/${user.id}/avatar.jpg`}
              alt="User" 
              width="40" 
              height="40" 
              className="user-avatar"
              onError={(e) => {
                e.currentTarget.src = "/images/user_icon.svg";
              }}
            />
            <svg width="40" height="40" viewBox="0 0 39 39" style={{ position: 'absolute', top: 0, left: 0 }}>
              <defs>
                <clipPath id="userMask">
                  <path d="M19.0791 0.5C22.3838 0.495595 25.6814 0.686394 32.2363 1.06445L34.2129 1.17773C35.1078 1.22935 35.8162 1.26964 36.3672 1.35547C36.9209 1.44175 37.387 1.58363 37.7627 1.88477C38.1573 2.20109 38.3403 2.60326 38.4238 3.0791C38.5019 3.52382 38.5 4.08029 38.5 4.73535V23.2393C38.5 25.0913 38.5007 26.5303 38.3428 27.6943C38.1822 28.8779 37.8533 29.8183 37.1719 30.6689C36.498 31.5099 35.5684 32.1528 34.2842 32.8027C33.0038 33.4507 31.3233 34.1289 29.1221 35.0176L24.123 37.0352C21.785 37.9791 20.4935 38.5101 19.083 38.5C17.672 38.4899 16.3931 37.9402 14.0801 36.9629L9.57715 35.0605C7.44527 34.1598 5.81712 33.4721 4.57715 32.8203C3.33334 32.1665 2.43311 31.5258 1.78223 30.6953C1.12395 29.8553 0.806418 28.931 0.651367 27.7705C0.49894 26.6292 0.5 25.2203 0.5 23.4072V4.72461C0.499999 4.07195 0.498496 3.51757 0.576172 3.07422C0.65934 2.59968 0.84135 2.19797 1.23438 1.88184C1.60858 1.58094 2.07325 1.43896 2.625 1.35156C3.17396 1.26462 3.87899 1.22276 4.77051 1.16895L5.92578 1.09961C12.4785 0.704099 15.7745 0.504414 19.0791 0.5Z" />
                </clipPath>
              </defs>
            </svg>
          </div>
        ) : (
          <img 
            src="/images/user_icon.svg" 
            alt="User" 
            width="40" 
            height="40" 
          />
        )}
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="container container-user-menu">
          {/* Блок с наградами */}
          <div>
            <div className="rewards-container">
              {loading ? (
                <span>Загрузка...</span>
              ) : user?.rewards && user.rewards.length > 0 ? (
                user.rewards.map((reward, index) => (
                  <span 
                    key={index} 
                    title={reward}
                    onClick={() => handleRewardClick(reward)}
                  >
                    <img 
                      src={`/models/rewards/${reward}/${reward}.png`}
                      alt={reward}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </span>
                ))
              ) : (
                <span>Нет наград</span>
              )}
            </div>
          </div>

          {/* Меню действий */}
            <button onClick={handleLogout}>
              Выйти
            </button>
        </div>
      )}

      {/* Модальное окно с 3D Viewer теперь рендерится в HomePage */}
    </div>
  );
}

export default UserMenu;
