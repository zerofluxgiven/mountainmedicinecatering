import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

export default function ChatInput({ onSendMessage, disabled, placeholder }) {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height
    const newHeight = Math.min(textarea.scrollHeight, 200); // Max 200px
    textarea.style.height = `${newHeight}px`;
    
    // Update expanded state
    setIsExpanded(newHeight > 60);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      setIsExpanded(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const quickActions = [
    { icon: '📋', label: 'Suggest menu', action: 'Can you suggest a menu for my event?' },
    { icon: '🥗', label: 'Find recipes', action: 'Show me some vegetarian recipe options' },
    { icon: '📊', label: 'Scale recipe', action: 'Help me scale a recipe for more guests' },
    { icon: '🛒', label: 'Shopping list', action: 'Create a shopping list for my menu' }
  ];

  const handleQuickAction = (action) => {
    setMessage(action);
    textareaRef.current?.focus();
  };

  return (
    <div className={`chat-input-container ${isExpanded ? 'expanded' : ''}`}>
      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className="quick-action-btn"
            onClick={() => handleQuickAction(action.action)}
            disabled={disabled}
            title={action.label}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="message-input"
            rows={1}
          />
          
          <div className="input-actions">
            {message.length > 0 && (
              <span className="char-count">
                {message.length}
              </span>
            )}
            
            <button
              type="submit"
              disabled={!message.trim() || disabled}
              className="send-btn"
              title="Send message (Enter)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 2L11 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="input-hint">
          Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
        </div>
      </form>
    </div>
  );
}