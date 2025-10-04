import React, { useState, useEffect, Suspense } from 'react';
import UserMenu from './UserMenu';
import SupportButton from './SupportButton';
import Footer from './Footer';
import NameInputModal from './NameInputModal';
import AuthForm from './AuthForm';
import ParallaxImage from './ParallaxImage';
import RewardViewer from './RewardViewer/RewardViewer';
import { tryNativeShare, copyToClipboard, ShareData } from '../utils/shareUtils';
import './AuthPage.css';

const AuthPage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  // Убираем showAuthModal - форма авторизации всегда видна на этой странице
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardModalData, setRewardModalData] = useState<{rewardId: string, userName: string, userId?: string} | null>(null);
  const [rewardsData, setRewardsData] = useState<any[]>([]);
  
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    // Если пользователь уже авторизован, перенаправляем на главную страницу
    if (token) {
      window.location.href = '/';
      return;
    }
    
    if (token) {
      loadUserData();
    }

    // Загружаем данные наград
    loadRewardsData();

    // Проверяем URL параметры для модального окна награды
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const rewardParam = urlParams.get('reward');
    
    if (userParam && rewardParam) {
      // Если userParam выглядит как ID, загружаем данные пользователя
      if (userParam.length === 24 && /^[0-9a-fA-F]+$/.test(userParam)) {
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
  }, [showRewardModal]);

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

  const handleAuthSuccess = (token: string, userId: string) => {
    setIsLoggedIn(true);
    loadUserData();
    // Перенаправляем на главную страницу после успешной авторизации
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

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
    // Закрываем модальное окно награды - форма авторизации уже видна на странице
    handleRewardModalClose();
  };

  return (
    <div>
      <ParallaxImage
        mainImage="/images/glukograd_bg.jpg"
        depthMap="/images/glukograd_bg_depth.jpg"
        foregroundImage="/images/glukograd_fg.png"
        foregroundDepthMap="/images/glukograd_fg_depth.jpg"
        intensity={3.0}
        minOffset={-100}
        maxOffset={200}
        sensitivity={1.2}
      >
        {/* Форма авторизации по центру изображения */}
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </ParallaxImage>
      
      <div>
        <header className="header">
          <div className="logo-container">
            <img 
              src="/images/glukograd_logo.png" 
              alt="Глюкоград логотип"
              className="logo"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Кнопка "Назад" убрана - авторизованные пользователи перенаправляются автоматически */}
            {isLoggedIn && <UserMenu onLogout={handleLogout} />}
          </div>
        </header>

        <section style={{
          margin: '0 20%'
        }}>
          <div>
            <h1>Что это?</h1>
            <div>
              <p>
                <strong>Глюкоград</strong> — это цифровое отражение твоего города. 
                Здесь двор становится игровым уровнем, а уличные глюки новыми ориентирами 
                для поиска редких артефактов. В Глюкограде можно найти постоянные объекты 
                творчества, которые оставляют друзья, а за свою активность получить статус 
                архитектора, мэра, а так же заработать награды, которые стоят целые глюкоины!
              </p>
              <p>
                Мир Глюкограда только зарождается, и ты можешь ускорить его развитие, 
                питая его поддержкой и бустами. Стань пионером в его исследовании, 
                следи за новостями и знаками.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div>
            <SupportButton />
          </div>
        </section>
      </div>
      <Footer />
      
      {/* Модальное окно для ввода имени */}
      <NameInputModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
        onClose={() => setShowNameModal(false)}
      />


               {/* Модальное окно для награды из URL */}
               {showRewardModal && rewardModalData && (
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
               )}
    </div>
  );
};

export default AuthPage;
