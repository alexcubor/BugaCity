import React, { useState, useEffect } from 'react';
import UserMenu from './UserMenu';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.reload();
  };

  return (
    <div>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'url(/images/glukograd_concept.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: -1
      }}></div>
      <div>
        <header>
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

        <section>
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
            <h2>Поддержать проект</h2>
            <div>
              <button>ПОДДЕРЖАТЬ ПРОЕКТ</button>
            </div>
            <div>
              <p>На базе технологий</p>
              <div>
                <a href="#">веб-AR движка</a>
                <a href="#">Yadviga SLAM</a>
              </div>
            </div>
            <div>
              <p>В сообщении доната укажи свою почту!</p>
              <p>Это поможет в будущем начислить награду</p>
            </div>
            <div>
              <h3>Поддержать на Boosty</h3>
              <a href="#">Boosty</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
