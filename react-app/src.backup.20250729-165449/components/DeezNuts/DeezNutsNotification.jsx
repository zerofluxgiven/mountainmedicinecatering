import React, { useEffect, useState } from 'react';
import './DeezNutsNotification.css';

export default function DeezNutsNotification({ message, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 100);
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };
  
  return (
    <div className={`deez-nuts-notification ${isVisible ? 'visible' : ''}`}>
      <div className="nut-icon">🥜</div>
      <div className="nut-message">{message}</div>
      <button className="nut-close" onClick={handleClose}>×</button>
    </div>
  );
}