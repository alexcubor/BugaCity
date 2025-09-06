import React, { useState, useEffect } from 'react';
import UserMenu from './UserMenu';
import SupportButton from './SupportButton';
import Footer from './Footer';
import NameInputModal from './NameInputModal';
import AuthModal from './AuthModal';
import ParallaxImage from './ParallaxImage';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    if (token) {
      loadUserData();
    }
  }, []);



  const loadUserData = async () => {
    console.log('loadUserData вызван');
    if (isLoadingUser) {
      console.log('loadUserData уже выполняется, пропускаем');
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
        
        console.log('Данные пользователя:', userData);
        // Проверяем, есть ли имя у пользователя
        if (!userData.name || userData.name.trim() === '') {
          console.log('Имя отсутствует, показываем модальное окно');
          setShowNameModal(true);
        } else {
          console.log('Имя есть:', userData.name);
          // Если у пользователя есть имя, проверяем награду Pioneer
          if (userData.rewards && userData.rewards.includes('pioneer')) {
            console.log('Награда Pioneer найдена у пользователя');
          } else {
            console.log('Награда Pioneer не найдена');
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
    console.log('handleNameSubmit вызван с именем:', name);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Токен не найден');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;
      console.log('userId:', userId);

      console.log('Отправляем запрос на обновление имени...');
      const response = await fetch(`/api/users/${userId}/update-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      console.log('Ответ на обновление имени:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Результат обновления имени:', result);
        
        setUser({ ...user, name });
        setShowNameModal(false);
        
        // Попытка выдать награду, если её ещё нет
        if (!user.rewards || !user.rewards.includes('pioneer')) {
          console.log('Попытка выдать награду Pioneer...');
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
              console.log('Награда успешно выдана:', rewardResult);
              setUser((prev: any) => ({ ...prev, rewards: [...(prev.rewards || []), 'pioneer'] }));
            } else {
              console.log('Награда уже есть у пользователя или ошибка выдачи');
            }
          } catch (error) {
            console.log('Ошибка при выдаче награды:', error);
          }
        }
        
        // Перезагружаем данные пользователя и перенаправляем на награду
        await loadUserData();
        
        // Перенаправляем на страницу с наградой Pioneer
        const url = new URL(window.location.href);
        url.searchParams.set('reward', 'pioneer');
        window.history.pushState({}, '', url);
        console.log('Перенаправляем на награду Pioneer');
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
  };



  return (
    <div>
      <ParallaxImage
        mainImage="/images/glukograd_bg.png"
        depthMap="/images/glukograd_bg_depth.png"
        foregroundImage="/images/glukograd_fg.png"
        foregroundDepthMap="/images/glukograd_fg_depth.png"
        intensity={3.0}
        minOffset={-100}
        maxOffset={200}
        sensitivity={1.2}
      >

        {/* Кнопка "ВОЙТИ" - только для неавторизованных пользователей */}
        {!isLoggedIn && (
          <div className="login-button-container">
            <button
              className="login-button"
              onClick={() => setShowAuthModal(true)}
            >
              ВОЙТИ
            </button>
          </div>
        )}
      </ParallaxImage>
      
      {/* Секция с надписью для авторизованных пользователей */}
      {isLoggedIn && (
        <section style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            margin: 0,
            lineHeight: 1.2,
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)'
          }}>
            Скоро здесь появятся<br />
            новые активности
          </h1>
        </section>
      )}
      
      <div>
        <header className="header">
          <div className="logo-container">
            <img 
              src="/images/glukograd_logo.png" 
              alt="Глюкоград логотип"
              className="logo"
            />
          </div>
          <nav>
            {isLoggedIn && <UserMenu onLogout={handleLogout} />}
          </nav>
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

      {/* Модальное окно для авторизации */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default HomePage;
