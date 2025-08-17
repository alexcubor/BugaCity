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

function UserMenu({ onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState<string | null>(null);

  useEffect(() => {
    // Загружаем данные пользователя при открытии меню
    if (isOpen && !user) {
      loadUserData();
    }
  }, [isOpen]);

  // Проверяем URL при загрузке страницы
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rewardParam = urlParams.get('reward');
    if (rewardParam) {
      setSelectedReward(rewardParam);
      // Загружаем данные пользователя, если есть параметр reward
      loadUserData();
    }
  }, []);

  // Обработчик кнопки "Назад" в браузере
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const rewardParam = urlParams.get('reward');
      if (!rewardParam) {
        setSelectedReward(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    } finally {
      setLoading(false);
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

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div>
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
            <h2>Мои награды:</h2>
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
          <ul>
            <li>
              <button onClick={handleLogout}>
                Выйти
              </button>
            </li>
          </ul>
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
          onLoad={() => {}}
          onError={(error: string) => console.error(`Ошибка загрузки ${selectedReward}:`, error)}
        />
      )}
    </div>
  );
}

export default UserMenu;
