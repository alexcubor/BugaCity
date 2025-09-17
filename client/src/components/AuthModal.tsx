import React, { useState } from 'react';
import SocialButtons from './SocialButtons';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, userId: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
        // Для входа - сначала проверяем, существует ли email
        await checkEmailExists();
      } else {
        // Для регистрации - сначала проверяем email
        await checkEmailAndSendCode();
      }
    }
  };

  const checkEmailExists = async () => {
    try {
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const checkResult = await checkResponse.json();
      
      if (checkResult.exists) {
        // Email существует - переходим к вводу пароля
        setIsAnimating(true);
        setTimeout(() => {
          setShowPassword(true);
          setIsAnimating(false);
        }, 300);
      } else {
        // Email не существует - показываем ошибку
        setMessage('Пользователя с таким email не существует');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка проверки email');
      setMessageType('error');
    }
  };

  const checkEmailAndSendCode = async () => {
    try {
      // Сначала проверяем, существует ли email
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const checkResult = await checkResponse.json();
      
      if (checkResult.exists) {
        setMessage('Пользователь с такой почтой уже существует');
        setMessageType('error');
        console.log('Email уже существует:', checkResult);
        return;
      }

      console.log('Email свободен, отправляем код');
      // Сразу показываем поле для ввода кода и сообщение
      setIsCodeSent(true);
      setMessage('Код подтверждения отправлен на вашу почту');
      setMessageType('success');
      setIsAnimating(true);
      setTimeout(() => {
        setShowVerification(true);
        setIsAnimating(false);
      }, 300);

      // Отправляем код в фоне (не ждем ответа)
      sendVerificationCodeInBackground();
    } catch (error) {
      console.error('Ошибка проверки email:', error);
      setMessage('Ошибка проверки email');
      setMessageType('error');
    }
  };

  const sendVerificationCodeInBackground = async () => {
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Если отправка не удалась, обновляем сообщение
        setMessage(result.error || 'Ошибка отправки кода');
        setMessageType('error');
      }
    } catch (error) {
      // Если ошибка сети, обновляем сообщение
      setMessage('Ошибка сети');
      setMessageType('error');
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
    console.log('Social login success:', data);
  };

  const handleSocialError = (error: any) => {
    console.error('Social login error:', error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Frontend - handleSubmit called:', { isLogin, email, password: password?.length });
    
    // Проверяем совпадение паролей при регистрации
    if (!isLogin && password !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const data = isLogin ? { email, password } : { email, password, verificationCode };
    
    console.log('🔍 Frontend - Sending data:', data);
    
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
        
        // Если это регистрация (не логин), перенаправляем на награду
        if (!isLogin) {
          window.location.href = '/?reward=pioneer';
        } else {
          onSuccess(result.token, result.userId);
          onClose();
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Ошибка');
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowVerification(false);
    setIsCodeSent(false);
    setVerificationCode('');
    setMessage('');
    setMessageType('');
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>
        
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
          
          {message && (
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
            resetForm();
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

export default AuthModal;
