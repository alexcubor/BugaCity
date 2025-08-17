import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import UserMenu from './components/UserMenu';
import './styles/styles.css';

// Компонент главной страницы
function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    
    // Устанавливаем фоновое изображение
    const backgroundElement = document.querySelector('.background-image') as HTMLElement;
    if (backgroundElement) {
      backgroundElement.style.backgroundImage = "url('/images/glukograd_concept.png')";
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    window.location.reload(); // Перезагружаем страницу
  };

  return (
    <div>
      {/* Фоновое изображение */}
      <div className="background-image"></div>
      
      <div>
        <h1>Добро пожаловать в BugaCity!</h1>
        <p>Это главная страница проекта</p>
        
        {isLoggedIn ? (
          <div>
            <p>Вы авторизованы!</p>
            <UserMenu onLogout={handleLogout} />
          </div>
        ) : (
          <a href="/login">Войти в систему</a>
        )}
      </div>
    </div>
  );
}

// Компонент страницы входа
function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const data = isLogin ? { username, password } : { username, password, name };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.token) {
        localStorage.setItem('token', result.token);
        window.location.href = '/'; // Возвращаемся на главную
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Ошибка');
    }
  };

  return (
    <div>
      <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        {!isLogin && (
          <div>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        )}
        
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit">
          {isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
      
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Перейти к регистрации' : 'Перейти к входу'}
      </button>
    </div>
  );
}

// Главный компонент с маршрутизацией
function App() {
  const path = window.location.pathname;
  
  if (path === '/login') {
    return <LoginPage />;
  }
  
  return <HomePage />;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
