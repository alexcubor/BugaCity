import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './components/HomePage';
import './styles.css';

// Ленивая загрузка SceneEditor (Babylon.js загрузится только когда нужен)
const SceneEditor = lazy(() => import('./admin/SceneEditor'));

// Главный компонент с маршрутизацией
function App() {
  const path = window.location.pathname;
  
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
  
  return <HomePage />;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
