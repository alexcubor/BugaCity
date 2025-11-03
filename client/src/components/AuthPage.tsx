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
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  

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

  // Плавно скрываем стрелку при прокрутке вниз
  useEffect(() => {
    const onScroll = () => {
      const atTop = window.scrollY < 40;
      setShowScrollIndicator(atTop);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        
        // Если это новый пользователь через OAuth, сразу показываем награду (имя уже известно)
        if (isNewUser === 'true') {
          window.location.href = '/?reward=pioneer';
        } else {
          window.location.href = '/';
        }
        return;
      }
      
      // Убираем дублирующий вызов openRewardModal - теперь он вызывается в loadUserData
      if (showRewardModal && !userParam && !rewardParam) {
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
              console.error('Ошибка добавления награды:', await rewardResponse.text());
            }
          } catch (error) {
            console.error('Ошибка добавления награды:', error);
          }
        }
        
        // Перенаправляем на страницу с наградой Pioneer
        window.location.href = `/?user=${userId}&reward=pioneer`;
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
        <div className="auth-hero">
        {/* Форма авторизации по центру изображения */}
        <AuthForm onAuthSuccess={handleAuthSuccess} />
          <button
            className={`scroll-indicator ${showScrollIndicator ? '' : 'hidden'}`}
            onClick={() => {
              const el = document.getElementById('info-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            aria-label="Прокрутите вниз к описанию"
          >
            <span className="scroll-indicator-text">Прокрути вниз</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </ParallaxImage>
      
      {showInvestorModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowInvestorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>По вопросам инвестирования свяжитесь с автором проекта</h3>
            <p style={{ marginTop: 8, marginBottom: 14 }}>в Телеграме:</p>
            <a className="tg-button" href="https://t.me/alexcubor" target="_blank" rel="noreferrer noopener">@alexcubor</a>
            <button className="modal-close" onClick={() => setShowInvestorModal(false)}>Закрыть</button>
          </div>
        </div>
      )}

      <div id="info-section" className="info-section">
        <header className="header">
          <div className="logo-container">
            <img 
              src="/images/discover-city_logo.webp" 
              alt="Глюкоград логотип"
              className="logo"
            />
            <div className="logo-subtext">Проект социальной сети Глюкоград</div>
            <div className="logo-tagline">Игра, построенная вокруг реального мира.</div>
            <div className="pilot-badge">Пилотный запуск планируется<br/>не позже 1 мая 2026 года</div>
            <button
              className="investor-slot-portrait"
              onClick={() => setShowInvestorModal(true)}
              aria-label="Я инвестор"
            >
              Я инвестор
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              className="investor-slot"
              onClick={() => setShowInvestorModal(true)}
              aria-label="Я инвестор"
            >
              Я инвестор
            </button>
            {/* Кнопка "Назад" убрана - авторизованные пользователи перенаправляются автоматически */}
            {isLoggedIn && <UserMenu onLogout={handleLogout} />}
          </div>
        </header>

        <section style={{
          margin: '0 20%'
        }}>
          <div>
            <h1>Об игре</h1>
            <div>
              <p>
                Социальная мобильная игра <strong>Открывай города</strong> — место, где игроки 
                становятся искателями драгоценных исторических артефактов, доступных только в 
                определенных местах разных городов мира. В каждом народе существуют свои сказочные 
                герои, которые расскажут об особенностях местности. Они могут стать для игрока 
                ценными проводниками и помочь быстрее и интереснее проходить игру.
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
               )}
    </div>
  );
};

export default AuthPage;
