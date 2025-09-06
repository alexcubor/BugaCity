import React, { useState, useEffect, useRef } from 'react';
import './SupportButton.css';

interface SupportButtonProps {
  onClick?: () => void;
}

const SupportButton: React.FC<SupportButtonProps> = ({ onClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleButtonClick = () => {
    setIsModalOpen(true);
    onClick?.();
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Функция для определения маленького экрана
  const isSmallScreen = () => {
    return window.innerWidth <= 600;
  };

  // Функция для включения анимации прогресса на маленьких экранах
  const enableScrollProgressOnSmallScreen = () => {
    const btn = buttonRef.current;
    if (!btn) { 
      console.log('No .button-item found'); 
      return; 
    }
    
    let target = 0;
    let current = 0;
    let rafId: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          target = entry.intersectionRatio;
          if (!rafId) animate();
        });
      },
      {
        threshold: Array.from({ length: 6 }, (_, i) => i * 0.2) // 0, 0.2, ..., 1
      }
    );
    observer.observe(btn);

    function animate() {
      // Более плавное приближение (0.05)
      current += (target - current) * 0.5;
      if (btn) {
        btn.style.setProperty('--hover-progress', current.toString());
      }
      if (Math.abs(current - target) > 0.001) {
        rafId = requestAnimationFrame(animate);
      } else {
        if (btn) {
          btn.style.setProperty('--hover-progress', target.toString());
        }
        rafId = null;
      }
    }
  };

  const removeProgressOnResize = () => {
    const btn = buttonRef.current;
    if (btn && window.innerWidth > 600) {
      btn.style.removeProperty('--hover-progress');
    }
  };

  useEffect(() => {
    if (isSmallScreen()) {
      enableScrollProgressOnSmallScreen();
      window.addEventListener('resize', removeProgressOnResize);
    }

    return () => {
      window.removeEventListener('resize', removeProgressOnResize);
    };
  }, []);

  return (
    <>
      <div className="button-container">
        <div 
          ref={buttonRef}
          className="button-item" 
          onClick={handleButtonClick}
        >
          <div className="support-project-diagonal">
            <span className="support-word">ПОДДЕРЖАТЬ</span>
            <span className="project-word">ПРОЕКТ</span>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div id="support-modal" className="modal show">
          <div className="modal-content">
            <span className="modal-label" onClick={closeModal}>&times;</span>
            <div className="modal-hint">
              В сообщении доната укажи свою почту!<br />
              <span className="modal-hint-small">Это поможет в будущем начислить награду</span>
            </div>
            <a 
              href="https://boosty.to/glukograd" 
              target="_blank" 
              rel="noopener" 
              className="modal-boosty-btn"
            >
              Поддержать на Boosty
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportButton;
