import React from 'react';

const NotFound: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 20px 0' }}>404</h1>
      <h2 style={{ fontSize: '2rem', margin: '0 0 10px 0' }}>Страница не найдена</h2>
      <p style={{ fontSize: '1.2rem', margin: '0 0 30px 0', opacity: 0.8 }}>
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <a 
        href="/" 
        style={{ 
          color: '#007bff', 
          textDecoration: 'none',
          fontSize: '1.1rem',
          padding: '10px 20px',
          border: '1px solid #007bff',
          borderRadius: '5px',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#007bff';
          e.currentTarget.style.color = 'white';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#007bff';
        }}
      >
        Вернуться на главную
      </a>
    </div>
  );
};

export default NotFound;
