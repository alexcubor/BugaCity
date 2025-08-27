import React from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './components/HomePage';
import SceneEditor from './admin/SceneEditor';
import './styles.css';

// Главный компонент с маршрутизацией
function App() {
  const path = window.location.pathname;
  
  if (path === '/admin/scene') {
    return <SceneEditor />;
  }
  
  return <HomePage />;
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
