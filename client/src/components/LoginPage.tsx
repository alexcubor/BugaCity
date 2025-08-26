import React, { useState } from 'react';
import SocialButtons from './SocialButtons';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(e.target.value);
  };

  const handleSendVerificationCode = async () => {
    if (!email) {
      setMessage('Сначала введите email');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      
      if (response.ok) {
        setIsCodeSent(true);
        setMessage('Код подтверждения отправлен на вашу почту');
        setMessageType('success');
        // Сразу показываем поле для ввода кода
        setIsAnimating(true);
        setTimeout(() => {
          setShowVerification(true);
          setIsAnimating(false);
        }, 300);
      } else {
        setMessage(result.error || 'Ошибка отправки кода');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка сети');
      setMessageType('error');
    }
  };

  const handleNextStep = async () => {
    if (email && !isAnimating) {
      if (isLogin) {
        // Для входа - сразу показываем пароль
        setIsAnimating(true);
        setTimeout(() => {
          setShowPassword(true);
          setIsAnimating(false);
        }, 300);
      } else {
        // Для регистрации - отправляем код
        await handleSendVerificationCode();
      }
    }
  };

  const handleVerificationNext = () => {
    if (verificationCode && !showPassword && !isAnimating) {
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
    const data = isLogin ? { email, password } : { email, password, verificationCode };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('userId', result.userId);
        
        if (result.isPioneer) {
          alert(`🎉 Поздравляем! Вы стали Pioneer #${result.pioneerNumber}!`);
        }
        
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
            {!showPassword && !showVerification ? (
              // Первый шаг - только email
              <div className="form-field">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                />
              </div>
            ) : showVerification && !showPassword ? (
              // Второй шаг - email + код подтверждения
              <>
                <div className="form-field slide-out">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-in">
                  <label>Verification Code:</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={handleVerificationCodeChange}
                    placeholder="Введите код из email"
                    required
                  />
                </div>
              </>
            ) : showPassword && !showConfirmPassword ? (
              // Третий шаг - email + код + пароль
              <>
                <div className="form-field slide-out">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    disabled
                  />
                </div>
                {!isLogin && (
                  <div className="form-field slide-out">
                    <label>Verification Code:</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={handleVerificationCodeChange}
                      required
                      disabled
                    />
                  </div>
                )}
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
              // Четвертый шаг - все поля + подтверждение пароля
              <>
                <div className="form-field slide-out">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-out">
                  <label>Verification Code:</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={handleVerificationCodeChange}
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
          
          {message && showVerification && !showPassword && (
            <div className={`message ${messageType}`} style={{
              padding: '10px',
              margin: '10px 0',
              borderRadius: '5px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              {message}
            </div>
          )}
          
          {!showPassword && !showVerification ? (
            <button 
              type="button" 
              onClick={handleNextStep}
              disabled={!email}
            >
              Далее
            </button>
          ) : showVerification && !showPassword ? (
            <button 
              type="button" 
              onClick={handleVerificationNext}
              disabled={!verificationCode}
            >
              Далее
            </button>
          ) : showPassword && !showConfirmPassword ? (
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
          onClick={() => {
            setIsLogin(!isLogin);
            setShowPassword(false);
            setShowConfirmPassword(false);
            setShowVerification(false);
            setIsCodeSent(false);
            setVerificationCode('');
            setMessage('');
            setMessageType('');
          }}
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
