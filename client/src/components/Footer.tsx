import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-item">
          <p>На базе технологий</p>
          <div>
            <a href="https://github.com/alexcubor/Yadviga-SLAM">веб-AR движка</a>
          </div>
        </div>
        <div>
          <img 
            src="/images/yadviga_slam_logo.svg" 
            alt="Yadviga SLAM логотип"
            className="yadviga-logo"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
