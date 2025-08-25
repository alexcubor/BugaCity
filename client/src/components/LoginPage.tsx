import React, { useState } from 'react';
import SocialButtons from './SocialButtons';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleNextStep = () => {
    if (username && !showPassword && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setShowPassword(true);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handlePasswordNext = () => {
    if (password && !isLogin && !showConfirmPassword && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setShowConfirmPassword(true);
        setIsAnimating(false);
      }, 300);
    }
  };

    const handleSocialSuccess = (data: any) => {
    // Обработка успешной авторизации через социальные сети
    console.log('Social login success:', data);
  };

  const handleSocialError = (error: any) => {
    // Обработка ошибки авторизации через социальные сети
    console.error('Social login error:', error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем совпадение паролей при регистрации
    if (!isLogin && password !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const data = isLogin ? { username, password } : { username, password };
    
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
      <div className="container">
        <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-fields-container">
            {!showPassword ? (
              <div className="form-field">
                <label>Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                />
              </div>
            ) : !showConfirmPassword ? (
              <>
                <div className="form-field slide-out">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-in">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-field slide-out">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-out">
                  <label>Password:</label>
                  <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-in">
                  <label>Confirm Password:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
          
          {!showPassword ? (
            <button 
              type="button" 
              onClick={handleNextStep}
              disabled={!username}
            >
              Далее
            </button>
          ) : !showConfirmPassword ? (
            isLogin ? (
              <button type="submit">
                Войти
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handlePasswordNext}
                disabled={!password}
              >
                Далее
              </button>
            )
          ) : (
            <button type="submit">
              Зарегистрироваться
            </button>
          )}
        </form>
        
        <button 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Перейти к регистрации' : 'Перейти к входу'}
        </button>
        
        <SocialButtons
          isLogin={isLogin}
          onSuccess={handleSocialSuccess}
          onError={handleSocialError}
        />
      </div>
    </div>
  );
};

export default LoginPage;
