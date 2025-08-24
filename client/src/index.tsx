import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './components/HomePage';
import SceneEditor from './admin/SceneEditor';
import './styles.css';



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
  
  if (path === '/admin/scene') {
    return <SceneEditor />;
  }
  
  return <HomePage />;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
