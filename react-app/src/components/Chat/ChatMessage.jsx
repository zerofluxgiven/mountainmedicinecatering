import React from 'react';
import './ChatMessage.css';

export default function ChatMessage({ message, isUser }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // This year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Older
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  const renderContent = (content) => {
    // Split content into paragraphs
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if it's a list
      if (paragraph.includes('\n•') || paragraph.includes('\n-')) {
        const lines = paragraph.split('\n');
        const intro = lines[0];
        const items = lines.slice(1);
        
        return (
          <div key={index}>
            {intro && <p>{intro}</p>}
            <ul>
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^[•\-]\s*/, '')}</li>
              ))}
            </ul>
          </div>
        );
      }
      
      // Check if it's a numbered list
      if (paragraph.match(/\n\d+\./)) {
        const lines = paragraph.split('\n');
        const intro = lines[0];
        const items = lines.slice(1);
        
        return (
          <div key={index}>
            {intro && <p>{intro}</p>}
            <ol>
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          </div>
        );
      }
      
      // Regular paragraph
      return <p key={index}>{paragraph}</p>;
    });
  };

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{isUser ? 'You' : 'AI Assistant'}</span>
          <span className="message-time">{formatTimestamp(message.timestamp)}</span>
        </div>
        <div className="message-body">
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
}