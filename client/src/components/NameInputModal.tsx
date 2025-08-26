import React, { useState } from 'react';

interface NameInputModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

const NameInputModal: React.FC<NameInputModalProps> = ({ isOpen, onSubmit, onClose }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="container">
        <h2>Как тебя зовут?</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя и фамилия"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ color: name ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
            autoFocus
          />
          <button type="submit">Получить награду</button>
        </form>
      </div>
    </div>
  );
};

export default NameInputModal;
