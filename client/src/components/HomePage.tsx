import React, { useState, useEffect } from 'react';
import UserMenu from './UserMenu';
import SupportButton from './SupportButton';
import Footer from './Footer';
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
    </div>
  );
};

export default HomePage;
