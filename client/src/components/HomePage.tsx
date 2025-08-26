import React, { useState, useEffect } from 'react';
import UserMenu from './UserMenu';
import SupportButton from './SupportButton';
import Footer from './Footer';
import NameInputModal from './NameInputModal';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

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
        
        // Проверяем, есть ли уже награда Pioneer
        if (!user.rewards || !user.rewards.includes('pioneer')) {
          console.log('Отправляем запрос на выдачу награды...');
          const rewardResponse = await fetch(`/api/users/${encodeURIComponent(user.email)}/add-rewards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rewards: ['pioneer'] })
          });

          console.log('Ответ на выдачу награды:', rewardResponse.status);
          if (rewardResponse.ok) {
            const rewardResult = await rewardResponse.json();
            console.log('Результат выдачи награды:', rewardResult);
            
            // Обновляем данные пользователя
            setUser((prev: any) => ({ ...prev, rewards: [...(prev.rewards || []), 'pioneer'] }));
            
            // Перенаправляем на URL с наградой
            const url = new URL(window.location.href);
            url.searchParams.set('reward', 'pioneer');
            window.location.href = url.toString();
          } else {
            const errorText = await rewardResponse.text();
            console.error('Ошибка выдачи награды:', errorText);
          }
                } else {
          console.log('Награда Pioneer уже есть у пользователя');
        }
      } else {
        const errorText = await response.text();
        console.error('Ошибка обновления имени:', errorText);
      }
    } catch (error) {
      console.error('Ошибка обновления имени:', error);
    }
  };

  return (
    <div>
      <div style={{
        width: '100%',
        height: '100vh',
        backgroundImage: 'linear-gradient(to bottom, transparent 0%, transparent 90%, var(--color-background) 100%), url(/images/glukograd_concept.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}></div>
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
            {isLoggedIn ? (
              <UserMenu onLogout={handleLogout} />
            ) : (
              <a href="/login">Войти</a>
            )}
          </nav>
        </header>

        <section style={{
          margin: '0 20%'
        }}>
          <div>
            <h1>Что за..?</h1>
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
    </div>
  );
};

export default HomePage;
