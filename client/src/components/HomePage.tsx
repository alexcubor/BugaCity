import React, { useState, useEffect, Suspense } from 'react';
import UserMenu from './UserMenu';
import NameInputModal from './NameInputModal';
import RewardViewer from './RewardViewer/RewardViewer';
import MapboxMap from './MapboxMap';
import { tryNativeShare, copyToClipboard, ShareData } from '../utils/shareUtils';

const HomePage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  // Убираем состояние модального окна авторизации - теперь отдельная страница
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardModalData, setRewardModalData] = useState<{rewardId: string, userName: string, userId?: string} | null>(null);
  const [rewardsData, setRewardsData] = useState<any[]>([]);
  
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    // Проверяем URL параметры для модального окна награды
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const rewardParam = urlParams.get('reward');
    
    // Если пользователь не авторизован И нет параметров для просмотра награды, перенаправляем на страницу авторизации
    if (!token && !userParam && !rewardParam) {
      window.location.href = '/auth';
      return;
    }
    
    if (token) {
      loadUserData();
    }

    // Загружаем данные наград
    loadRewardsData();
    
    if (rewardParam) {
      if (userParam) {
        // Если userParam выглядит как ID (MongoDB ObjectId или числовой ID), загружаем данные пользователя
        if ((userParam.length === 24 && /^[0-9a-fA-F]+$/.test(userParam)) || /^\d+$/.test(userParam)) {
          fetch(`/api/users/${userParam}`)
            .then(response => response.ok ? response.json() : null)
            .then(userData => {
              if (userData && userData.name) {
                setRewardModalData({
                  rewardId: rewardParam,
                  userName: userData.name,
                  userId: userParam
                });
                setShowRewardModal(true);
              } else {
                // Если пользователь не найден, показываем с ID
                setRewardModalData({
                  rewardId: rewardParam,
                  userName: userParam,
                  userId: userParam
                });
                setShowRewardModal(true);
              }
            })
            .catch(() => {
              // Если не удалось загрузить пользователя, показываем с ID
              setRewardModalData({
                rewardId: rewardParam,
                userName: userParam,
                userId: userParam
              });
              setShowRewardModal(true);
            });
        } else {
          // Если это не ID, показываем как есть
          setRewardModalData({
            rewardId: rewardParam,
            userName: userParam,
            userId: userParam
          });
          setShowRewardModal(true);
        }
      } else {
        // Если есть только rewardParam без userParam, показываем награду без имени пользователя
        setRewardModalData({
          rewardId: rewardParam,
          userName: 'Пользователь',
          userId: undefined
        });
        setShowRewardModal(true);
      }
    }

  }, []);

  // Загружаем данные наград
  const loadRewardsData = async () => {
    try {
      const response = await fetch('/api/rewards');
      if (response.ok) {
        const allRewards = await response.json();
        setRewardsData(allRewards);
      } else {
        console.error('Ошибка загрузки наград:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных наград:', error);
    }
  };

  // Получаем данные выбранной награды
  const getSelectedRewardData = (rewardId: string) => {
    const found = rewardsData.find(reward => reward.id === rewardId) || null;
    return found;
  };

  // Единая функция для открытия модального окна награды
  const openRewardModal = (userParam: string, rewardParam: string) => {
    
    // Проверяем, является ли это ID пользователя (MongoDB ObjectId или числовой ID)
    const isMongoId = userParam.length === 24 && /^[0-9a-fA-F]+$/.test(userParam);
    const isNumericId = /^[0-9]+$/.test(userParam) && userParam.length >= 8;
    
    if (isMongoId || isNumericId) {
      // Если это ID, загружаем данные пользователя
      fetch(`/api/users/${userParam}`)
        .then(response => response.ok ? response.json() : null)
        .then(userData => {
          if (userData && userData.name) {
            setRewardModalData({
              rewardId: rewardParam,
              userName: userData.name,
              userId: userParam
            });
            setShowRewardModal(true);
          } else {
            // Если имя не найдено, используем ID
            setRewardModalData({
              rewardId: rewardParam,
              userName: userParam,
              userId: userParam
            });
            setShowRewardModal(true);
          }
        })
        .catch(() => {
          setRewardModalData({
            rewardId: rewardParam,
            userName: userParam,
            userId: userParam
          });
          setShowRewardModal(true);
        });
    } else {
      // Если это не ID, показываем как есть
      setRewardModalData({
        rewardId: rewardParam,
        userName: userParam,
        userId: userParam
      });
      setShowRewardModal(true);
    }
  };

  // Отслеживаем изменения URL
  useEffect(() => {
    const checkUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user');
      const rewardParam = urlParams.get('reward');
      const token = urlParams.get('token');
      const user = urlParams.get('user');
      const isNewUser = urlParams.get('isNewUser');
      
      
      // Обрабатываем OAuth callback для мобильных устройств
      if (token && user) {
        localStorage.setItem('token', token);
        
        // Очищаем URL от параметров OAuth
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('token');
        newUrl.searchParams.delete('user');
        newUrl.searchParams.delete('isNewUser');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Если это новый пользователь, показываем награду
        if (isNewUser === 'true') {
          window.location.href = '/?reward=pioneer';
        } else {
          window.location.reload();
        }
        return;
      }
      
      if (userParam && rewardParam) {
        openRewardModal(userParam, rewardParam);
      } else if (showRewardModal) {
        setShowRewardModal(false);
        setRewardModalData(null);
      }
    };

    // Проверяем при загрузке и при изменении URL
    checkUrl();
    window.addEventListener('popstate', checkUrl);
    
    return () => window.removeEventListener('popstate', checkUrl);
  }, []);

  const loadUserData = async () => {
    if (isLoadingUser) {
      return;
    }
    setIsLoadingUser(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Получаем ID пользователя из токена
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Проверяем, есть ли имя у пользователя
        if (!userData.name || userData.name.trim() === '') {
          setShowNameModal(true);
        } else {
          // Если у пользователя есть имя, проверяем награду Pioneer
          if (userData.rewards && userData.rewards.includes('pioneer')) {
          } else {
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    setShowNameModal(false);
    window.location.reload();
  };

  const handleNameSubmit = async (name: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const response = await fetch(`/api/users/me/update-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        const result = await response.json();
        
        setUser({ ...user, name });
        setShowNameModal(false);
        
        // Попытка выдать награду, если её ещё нет
        if (!user.rewards || !user.rewards.includes('pioneer')) {
          try {
            const rewardResponse = await fetch(`/api/users/${encodeURIComponent(user.email)}/add-rewards`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ rewards: ['pioneer'] })
            });

            if (rewardResponse.ok) {
              const rewardResult = await rewardResponse.json();
              setUser((prev: any) => ({ ...prev, rewards: [...(prev.rewards || []), 'pioneer'] }));
            } else {
            }
          } catch (error) {
          }
        }
        
        // Перезагружаем данные пользователя и перенаправляем на награду
        await loadUserData();
        
        // Перенаправляем на страницу с наградой Pioneer
        const url = new URL(window.location.href);
        url.searchParams.set('user', userId); // Используем ID пользователя
        url.searchParams.set('reward', 'pioneer'); // Потом награда
        window.history.pushState({}, '', url);
      } else {
        const errorText = await response.text();
        console.error('Ошибка обновления имени:', errorText);
      }
    } catch (error) {
      console.error('Ошибка обновления имени:', error);
    }
  };

  // Функция handleAuthSuccess убрана - авторизация теперь на отдельной странице

  const handleRewardModalClose = () => {
    setShowRewardModal(false);
    setRewardModalData(null);
    // Убираем параметры из URL
    const url = new URL(window.location.href);
    url.searchParams.delete('user');
    url.searchParams.delete('reward');
    window.history.pushState({}, '', url);
  };

  const handleShareClick = async () => {
    if (rewardModalData?.userId && rewardModalData?.rewardId) {
      const shareUrl = `${window.location.origin}/?user=${rewardModalData.userId}&reward=${rewardModalData.rewardId}`;
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

  const handleGetRewardClick = () => {
    console.log('🔘 Кнопка "Получить такую же!" нажата');
    console.log('🔐 isLoggedIn:', isLoggedIn);
    
    // Если пользователь не авторизован, перенаправляем на страницу авторизации
    if (!isLoggedIn) {
      console.log('🚀 Перенаправляем на страницу авторизации');
      window.location.href = '/auth';
      return;
    }
    
    console.log('✅ Пользователь авторизован, открываем модальное окно');
    // Если авторизован, открываем модальное окно награды
    setRewardModalData({
      rewardId: 'pioneer',
      userName: user?.name || 'Пользователь',
      userId: user?.id
    });
    setShowRewardModal(true);
  };

  const handleUserNameChange = (newName: string) => {
    // Обновляем данные пользователя
    loadUserData();
  };

  const handleRewardClick = (reward: string) => {    
    // Открываем модальное окно награды
    const modalData = {
      rewardId: reward,
      userName: user?.name || 'Пользователь',
      userId: user?.id
    };
    setRewardModalData(modalData);
    setShowRewardModal(true);
  };



  return (
    <>
      {/* Логотип в верхнем левом углу */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        width: '64px',
        height: '64px'
      }}>
        <img 
          src="/favicon.ico" 
          alt="Glukograd Logo" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* UserMenu без header */}
      <UserMenu 
        onLogout={handleLogout} 
        onRewardClick={handleRewardClick} 
        onUserNameChange={handleUserNameChange}
        isUserLoggedIn={isLoggedIn}
      />

      {/* Карта Mapbox на весь экран */}
      <MapboxMap 
        style={{ 
          width: '100vw', 
          height: '100vh' 
        }}
        isUserLoggedIn={isLoggedIn}
      />
      
      {/* Модальное окно для ввода имени */}
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
        onClose={() => setShowNameModal(false)}
      />

      {/* Модальное окно авторизации убрано - теперь отдельная страница /auth */}

               {/* Модальное окно для награды из URL */}
               {showRewardModal && rewardModalData && (
                 <>
                   <Suspense fallback={<div style={{ 
                     display: 'flex', 
                     justifyContent: 'center', 
                     alignItems: 'center', 
                     height: '400px',
                     fontSize: '16px',
                     color: '#666'
                   }}>Загрузка 3D модели...</div>}>
                   <RewardViewer
                     rewardId={rewardModalData.rewardId}
                     size="large"
                     autoRotate={true}
                     isModal={true}
                     onClose={handleRewardModalClose}
                     modalTitle={`Награда: ${rewardModalData.rewardId}`}
                     userName={rewardModalData.userName}
                     rewardName={getSelectedRewardData(rewardModalData.rewardId)?.name}
                     rewardPrice={getSelectedRewardData(rewardModalData.rewardId)?.price}
                     rewardDescription={getSelectedRewardData(rewardModalData.rewardId)?.description}
                     isUserLoggedIn={isLoggedIn}
                     onShareClick={handleShareClick}
                     onGetRewardClick={handleGetRewardClick}
                     showNotification={showNotification}
                     onLoad={() => {}}
                     onError={(error: string) => console.error(`Ошибка загрузки ${rewardModalData.rewardId}:`, error)}
                   />
                 </Suspense>
                 </>
               )}
    </>
  );
};

export default HomePage;
