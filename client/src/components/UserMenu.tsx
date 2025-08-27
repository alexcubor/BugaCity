import React, { useState, useEffect } from 'react';
import RewardViewer from './RewardViewer';
import './UserMenu.css';
import './RewardViewer/RewardViewer.css';

interface UserMenuProps {
  onLogout: () => void;
}

interface User {
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

function UserMenu({ onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [rewardsData, setRewardsData] = useState<Reward[]>([]);

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
      const response = await fetch('/api/awards');
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
    console.log('User data:', user);
    console.log('User name:', user?.name);
    setSelectedReward(reward);
    // Обновляем URL
    const url = new URL(window.location.href);
    url.searchParams.set('reward', reward);
    window.history.pushState({}, '', url);
  };

  const closeModal = () => {
    setSelectedReward(null);
    // Убираем параметр из URL
    const url = new URL(window.location.href);
    url.searchParams.delete('reward');
    window.history.pushState({}, '', url);
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

  return (
    <div className="user-menu">
      {/* Кнопка с аватаром */}
      <button onClick={toggleMenu}>
        <span>👤</span>
        <span>{user?.name || 'Пользователь'}</span>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="widget">
          {/* Контейнер с наградами */}
          <div>
            <div>
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
          <div>
            <button onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно с 3D Viewer */}
      {selectedReward && user?.name && (
        <RewardViewer
          rewardId={selectedReward}
          size="large"
          autoRotate={true}
          isModal={true}
          onClose={closeModal}
          modalTitle={`Награда: ${selectedReward}`}
          userName={user.name}
          rewardName={getSelectedRewardData()?.name}
          rewardPrice={getSelectedRewardData()?.price}
          rewardDescription={getSelectedRewardData()?.description}
          onLoad={() => {}}
          onError={(error: string) => console.error(`Ошибка загрузки ${selectedReward}:`, error)}
        />
      )}
    </div>
  );
}

export default UserMenu;
