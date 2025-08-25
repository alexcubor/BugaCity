import React, { useEffect, useRef } from 'react';
import { config } from '../config';
import './SocialButtons.css';

interface SocialButtonsProps {
  isLogin: boolean;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
}

declare global {
  interface Window {
    VKIDSDK: any;
  }
}

const SocialButtons: React.FC<SocialButtonsProps> = ({ isLogin, onSuccess, onError }) => {
  const vkContainerRef = useRef<HTMLDivElement>(null);
  const oAuthRef = useRef<any>(null);

  // Инициализация VK ID SDK
  useEffect(() => {
    if (!window.VKIDSDK || !vkContainerRef.current) return;

    const VKID = window.VKIDSDK;

    // Очищаем контейнер перед инициализацией
    if (vkContainerRef.current) {
      vkContainerRef.current.innerHTML = '';
    }

    // Инициализация конфигурации
    VKID.Config.init({
      app: config.VK_CLIENT_ID,
      redirectUrl: window.location.hostname === 'localhost' || window.location.hostname.includes('tuna.am')
        ? 'https://gluko-city.ru.tuna.am/api/auth/callback'
        : 'https://gluko.city/api/auth/callback',
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: '',
    });

    // Уничтожаем предыдущий экземпляр, если он существует
    if (oAuthRef.current && oAuthRef.current.destroy) {
      oAuthRef.current.destroy();
    }

    const oneTap = new VKID.OneTap();
    oAuthRef.current = oneTap;

    oneTap.render({
      container: vkContainerRef.current,
      fastAuthEnabled: false,
      showAlternativeLogin: true,
      styles: {
        borderRadius: 12,
        width: 40,
        height: 40
      }
    })
    .on(VKID.WidgetEvents.ERROR, handleVKError)
    .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, function (payload: any) {
      const code = payload.code;
      const deviceId = payload.device_id;

      VKID.Auth.exchangeCode(code, deviceId)
        .then(handleVKSuccess)
        .catch(handleVKError);
    });

    // Очистка при размонтировании
    return () => {
      if (oAuthRef.current && oAuthRef.current.destroy) {
        oAuthRef.current.destroy();
        oAuthRef.current = null;
      }
    };
  }, [isLogin]);

  const handleVKSuccess = async (data: any) => {
    try {
      console.log('VK ID SDK success data:', data);
      
      // Получаем информацию о пользователе через наш сервер (избегаем CORS)
      // Проверяем, есть ли user_id в данных
      const userId = data.user_id || data.user?.id;
      if (!userId) {
        throw new Error('Не удалось получить ID пользователя');
      }
      
      const userResponse = await fetch(`/api/auth/vk-user?accessToken=${encodeURIComponent(data.access_token)}&userId=${userId}`);
      const user = await userResponse.json();
      
      console.log('VK user data from server:', user);
      
      if (user.error) {
        throw new Error('Ошибка получения данных пользователя');
      }
      
      // Отправляем данные на сервер
      const requestData = {
        accessToken: data.access_token,
        userData: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email || data.email || `vk_${user.id}@vk.com` // Fallback email
        },
        action: isLogin ? 'login' : 'register'
      };
      
      console.log('Sending to server:', requestData);
      
      const response = await fetch('/api/auth/vk-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      if (result.token) {
        localStorage.setItem('token', result.token);
        window.location.href = '/';
      } else {
        alert(result.error || 'Ошибка авторизации');
      }
    } catch (error) {
      alert('Ошибка подключения к серверу');
    }
  };

  const handleVKError = (error: any) => {
    console.error('VK ID Error:', error);
    alert('Ошибка авторизации через ВКонтакте');
  };

  const handleYandexLogin = () => {
    // URL для OAuth авторизации Яндекса
    const redirectUri = window.location.hostname === 'localhost' || window.location.hostname.includes('tuna.am')
      ? 'https://gluko-city.ru.tuna.am/api/auth/callback'
      : 'https://gluko.city/api/auth/callback';
    
                 const yandexAuthUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${config.YANDEX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=yandex_${isLogin ? 'login' : 'register'}`;
    
    // Открываем окно авторизации
    const popup = window.open(yandexAuthUrl, 'social_auth', 'width=600,height=600');
    
    // Слушаем сообщения от popup окна
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'social_auth_success') {
        const { token, user } = event.data;
        localStorage.setItem('token', token);
        window.location.href = '/';
        window.removeEventListener('message', messageListener);
      } else if (event.data.type === 'social_auth_error') {
        alert(event.data.error);
        window.removeEventListener('message', messageListener);
      }
    };
    
    window.addEventListener('message', messageListener);
  };

  return (
    <div>
      <p>Или {isLogin ? 'войдите' : 'зарегистрируйтесь'} через:</p>
      <div className="social-buttons">
        <button
          type="button"
          className="social-btn"
          onClick={handleYandexLogin}
          title="Войти через Яндекс"
        >
          <img src="/images/yandex-icon.svg" alt="Яндекс" />
        </button>
        <div ref={vkContainerRef} className="social-btn" />
      </div>
    </div>
  );
};

export default SocialButtons;
