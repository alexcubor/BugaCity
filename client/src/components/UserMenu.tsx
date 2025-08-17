import React, { useState, useEffect } from 'react';
import RewardViewer from './RewardViewer';

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
    setSelectedReward(reward);
  };

  const closeModal = () => {
    setSelectedReward(null);
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
        <div>
          <span>👤</span> {/* Заглушка для аватара */}
          <span>{user?.name || 'Пользователь'}</span>
        </div>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div>
          {/* Контейнер с наградами */}
          <div>
            <h4>Мои награды:</h4>
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
                        // Fallback если изображение не найдено
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
      {selectedReward && (
        <div onClick={handleModalBackdropClick}>
          <div>
            <button onClick={closeModal}>
              ✕
            </button>
            <h3>Награда: {selectedReward}</h3>
            <RewardViewer 
              rewardId={selectedReward} 
              size="large" 
              autoRotate={true}
              showControls={true}
              onLoad={() => {}}
              onError={(error: string) => console.error(`Ошибка загрузки ${selectedReward}:`, error)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
