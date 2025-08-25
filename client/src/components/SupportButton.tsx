import React, { useState } from 'react';
import './SupportButton.css';

interface SupportButtonProps {
  onClick?: () => void;
  children?: React.ReactNode;
}

const SupportButton: React.FC<SupportButtonProps> = ({ 
  onClick, 
  children = "ПОДДЕРЖАТЬ ПРОЕКТ" 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleButtonClick = () => {
    setIsModalOpen(true);
    onClick?.();
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="support-button-container">
        <button 
            className="support-button" 
            onClick={handleButtonClick}
        >
            {children}
        </button>
      </div>

      {isModalOpen && (
        <div className="support-modal-overlay" onClick={closeModal}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            <div className="support-modal-content">
              <div>
                <p>В сообщении доната укажи свою почту!</p>
                <p>Это поможет в будущем начислить награду</p>
              </div>
              <div>
                <h3>Поддержать на Boosty</h3>
                <a href="#">Boosty</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportButton;
