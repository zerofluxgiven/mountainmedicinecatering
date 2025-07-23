import React, { useState, useEffect } from 'react';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../contexts/AuthContext';
import './ConversationSidebar.css';

export default function ConversationSidebar({ 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation,
  isOpen,
  onClose 
}) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await conversationService.getUserConversations(currentUser.uid, 50);
      setConversations(userConversations);
      setFilteredConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter conversations based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv => {
        const title = conv.metadata?.title || 'Conversation';
        return title.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredConversations(filtered);
    }
  }, [searchTerm, conversations]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    return date.toLocaleDateString();
  };

  const handleImportConversation = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Create new conversation with imported messages
        const convId = await conversationService.createConversation(
          currentUser.uid,
          currentUser.email,
          { 
            title: data.title || 'Imported Conversation',
            imported: true,
            importedAt: new Date().toISOString()
          }
        );
        
        // Add messages to the conversation
        if (data.messages && Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            await conversationService.addMessage(
              convId,
              msg.type === 'user' ? 'user' : 'assistant',
              msg.content,
              { imported: true }
            );
          }
        }
        
        // Reload conversations
        loadConversations();
        
        // Select the imported conversation
        onSelectConversation(convId);
      } catch (error) {
        console.error('Error importing conversation:', error);
        alert('Failed to import conversation. Please check the file format.');
      }
    };
    
    input.click();
  };

  return (
    <div className={`conversation-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h3>Conversations</h3>
        <button className="close-sidebar" onClick={onClose}>×</button>
      </div>

      <button 
        className="new-conversation-btn"
        onClick={onNewConversation}
      >
        New Conversation
      </button>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search"
            onClick={() => setSearchTerm('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="conversations-list">
        {loading ? (
          <div className="loading">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <small>Start a new conversation to begin</small>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">
            <p>No matching conversations</p>
            <small>Try a different search term</small>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-preview">
                <div className="conversation-title">
                  {conv.metadata?.title || 'Conversation'}
                </div>
                <div className="conversation-meta">
                  <span className="message-count">{conv.messageCount || 0} messages</span>
                  <span className="timestamp">{formatDate(conv.lastMessageAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="footer-actions">
          <button 
            className="text-btn"
            onClick={handleImportConversation}
          >
            Import
          </button>
          <button 
            className="text-btn danger"
            onClick={() => {
              if (window.confirm('Clear all conversation history? This cannot be undone.')) {
                // Clear all conversations for this user
                conversations.forEach(conv => {
                  conversationService.endConversation(conv.id);
                });
                setConversations([]);
                setFilteredConversations([]);
              }
            }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}