import React, { Suspense, lazy, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import AdminGuard from './components/AdminPanel/AdminGuard';
import NotFound from './components/NotFound';
import UserMenu from './components/UserMenu';
import './styles.css';

// Ленивая загрузка SceneEditor (Babylon.js загрузится только когда нужен)
const SceneEditor = lazy(() => import('./admin/SceneEditor'));

// Главный компонент с маршрутизацией
function App() {
  const path = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  const rewardParam = urlParams.get('reward');
  
  if (path === '/admin') {
    return <AdminGuard />;
  }
  
  if (path === '/admin/scene') {
    return (
      <Suspense fallback={<div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>Загрузка 3D редактора...</div>}>
        <SceneEditor />
      </Suspense>
    );
  }
  
  if (path === '/auth') {
    return <AuthPage />;
  }
  
  // Если есть параметры user или reward, показываем HomePage с модальным окном
  if (userParam || rewardParam) {
    return <HomePage />;
  }
  
  return <HomePage />;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
