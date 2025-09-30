import React, { useState, useEffect, useRef } from 'react';
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
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Отслеживаем автозаполнение браузера
  useEffect(() => {
    const checkAutofill = () => {
      if (emailInputRef.current && emailInputRef.current.value !== email) {
        setEmail(emailInputRef.current.value);
      }
    };

    // Проверяем автозаполнение при открытии модального окна
    if (isOpen) {
      const timer = setTimeout(checkAutofill, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, email]);

  const handleEmailInput = (e: React.FormEvent<HTMLInputElement>) => {
    setEmail(e.currentTarget.value);
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

  const handleBack = () => {
    if (showConfirmPassword) {
      setShowConfirmPassword(false);
    } else if (showPassword) {
      setShowPassword(false);
    } else if (showVerification) {
      setShowVerification(false);
    }
  };

  const handleSocialSuccess = (data: any) => {
    console.log('Social login success:', data);
  };

  const handleSocialError = (error: any) => {
    console.error('Social login error:', error);
  };

  // Валидация email
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Некорректный формат email');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Валидация пароля
  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Пароль обязателен');
      return false;
    }
    
    if (password.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    
    if (password.length > 128) {
      setPasswordError('Пароль слишком длинный');
      return false;
    }
    
    if (!/[a-zA-Z]/.test(password)) {
      setPasswordError('Пароль должен содержать хотя бы одну букву');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  // Валидация подтверждения пароля
  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('');
      return true;
    }
    
    if (password !== confirmPassword) {
      setConfirmPasswordError('Пароли не совпадают');
      return false;
    }
    
    setConfirmPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Frontend - handleSubmit called:', { isLogin, email, password: password?.length });
    
    // Валидация полей
    const isEmailValid = validateEmail(email);
    const isPasswordValid = !isLogin ? validatePassword(password) : true;
    const isConfirmPasswordValid = !isLogin ? validateConfirmPassword(confirmPassword) : true;
    
    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }
    
    // Дополнительная проверка обязательности полей
    if (!isLogin) {
      if (!password) {
        setPasswordError('Пароль обязателен');
        return;
      }
      if (!confirmPassword) {
        setConfirmPasswordError('Подтвердите пароль');
        return;
      }
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
        setMessage(result.error);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка соединения с сервером');
      setMessageType('error');
    }
  };

  // Обработчики для полей ввода
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError(''); // Очищаем ошибку при вводе
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('🔍 Изменение пароля:', value);
    setPassword(value);
    setPasswordError(''); // Очищаем ошибку при вводе
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError(''); // Очищаем ошибку при вводе
  };

  // Валидация при нажатии Enter в поле пароля
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && password) {
      console.log('🔍 Enter нажат в поле пароля, пароль:', password);
      e.currentTarget.blur();
      if (isLogin) {
        e.preventDefault();
        handleSubmit(e);
      } else {
        // Валидируем пароль перед переходом к следующему шагу
        let errorMessage = '';
        
        if (!password) {
          errorMessage = 'Пароль обязателен';
        } else if (password.length < 6) {
          errorMessage = 'Пароль должен содержать минимум 6 символов';
        } else if (password.length > 128) {
          errorMessage = 'Пароль слишком длинный';
        } else if (!/[a-zA-Z]/.test(password)) {
          errorMessage = 'Пароль должен содержать хотя бы одну букву';
        }
        
        console.log('🔍 Валидация пароля:', { password, errorMessage });
        
        if (errorMessage) {
          console.log('🔍 Пароль невалиден, показываем ошибку:', errorMessage);
          setPasswordError(errorMessage);
          setMessage(errorMessage);
          setMessageType('error');
        } else {
          console.log('🔍 Пароль валиден, переходим к следующему шагу');
          setPasswordError('');
          setMessage(''); // Очищаем сообщение об ошибке
          setMessageType(''); // Очищаем тип сообщения
          handlePasswordNext();
        }
      }
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
    setPasswordError('');
    setConfirmPasswordError('');
    setEmailError('');
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
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onInput={handleEmailInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email) {
                      e.currentTarget.blur();
                      handleNextStep();
                    }
                  }}
                  required
                  style={{
                    borderColor: emailError ? '#ff4444' : '',
                    borderWidth: emailError ? '2px' : '1px'
                  }}
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
                  <label>Код подтверждения:</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={handleVerificationCodeChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && verificationCode) {
                        e.currentTarget.blur();
                        handleVerificationNext();
                      }
                    }}
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
                    <label>Код подтверждения:</label>
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
                  <label>Пароль:</label>
                  <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onKeyDown={handlePasswordKeyDown}
                    onKeyPress={(e) => {
                      console.log('🔍 KeyPress в поле пароля:', e.key);
                      if (e.key === 'Enter') {
                        console.log('🔍 Enter нажат в поле пароля через KeyPress');
                      }
                    }}
                    required
                    style={{
                      borderColor: passwordError ? '#ff4444' : '',
                      borderWidth: passwordError ? '2px' : '1px'
                    }}
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
                  <label>Код подтверждения:</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={handleVerificationCodeChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-out">
                  <label>Пароль:</label>
                  <input
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled
                  />
                </div>
                <div className="form-field slide-in">
                  <label>Подтвердите пароль:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && confirmPassword) {
                        e.currentTarget.blur();
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    required
                    style={{
                      borderColor: confirmPasswordError ? '#ff4444' : '',
                      borderWidth: confirmPasswordError ? '2px' : '1px'
                    }}
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
            <div style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={handleBack}
                style={{
                  width: '40px', 
                  minWidth: '40px',
                  flexShrink: 0
                }}
              >
                <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <button 
                type="button" 
                onClick={handleVerificationNext}
                disabled={!verificationCode}
                style={{ flex: '1' }}
              >
                Далее
              </button>
            </div>
          ) : showPassword && !showConfirmPassword ? (
            isLogin ? (
              <div style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={handleBack}
                  style={{
                    width: '40px', 
                    minWidth: '40px',
                    flexShrink: 0
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                <button type="submit" style={{ flex: '1' }}>
                  Войти
                </button>
              </div>
            ) : (
              <div style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={handleBack}
                  style={{
                    width: '40px', 
                    minWidth: '40px',
                    flexShrink: 0
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                <button 
                  type="button" 
                  onClick={handlePasswordNext}
                  disabled={!password}
                  style={{ flex: '1' }}
                >
                  Далее
                </button>
              </div>
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
