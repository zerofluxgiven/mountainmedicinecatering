// AI Conversation History Service
// Manages persistent conversation history for AI chat

const STORAGE_KEY = 'ai_conversation_history';
const MAX_MESSAGES = 100; // Keep last 100 messages
const MAX_AGE_DAYS = 7; // Keep messages for 7 days

class AIConversationHistory {
  constructor() {
    this.history = this.loadHistory();
  }

  // Load history from localStorage
  loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored);
      
      // Clean up old messages
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);
      
      return history.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate > cutoffDate;
      });
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  // Save history to localStorage
  saveHistory() {
    try {
      // Keep only the most recent messages
      const toSave = this.history.slice(-MAX_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  // Add a message to history
  addMessage(message) {
    const historyMessage = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    this.history.push(historyMessage);
    this.saveHistory();
  }

  // Get recent messages for context
  getRecentMessages(count = 10) {
    return this.history.slice(-count);
  }

  // Get all messages
  getAllMessages() {
    return [...this.history];
  }

  // Clear history
  clearHistory() {
    this.history = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  // Get conversation context for AI
  getConversationContext(messageCount = 5) {
    const recentMessages = this.getRecentMessages(messageCount);
    
    return recentMessages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  // Format history for display
  formatForDisplay() {
    return this.history.map(msg => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      options: msg.options,
      questionId: msg.questionId
    }));
  }

  // Search history
  searchHistory(query) {
    const searchTerm = query.toLowerCase();
    return this.history.filter(msg => 
      msg.content.toLowerCase().includes(searchTerm)
    );
  }

  // Get messages by date range
  getMessagesByDateRange(startDate, endDate) {
    return this.history.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      return msgDate >= startDate && msgDate <= endDate;
    });
  }

  // Export history as text
  exportAsText() {
    return this.history.map(msg => {
      const date = new Date(msg.timestamp).toLocaleString();
      const sender = msg.type === 'user' ? 'You' : 'AI';
      return `[${date}] ${sender}: ${msg.content}`;
    }).join('\n\n');
  }

  // Export history as JSON
  exportAsJSON() {
    return JSON.stringify(this.history, null, 2);
  }

  // Import history from JSON
  importFromJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.history = imported;
        this.saveHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing history:', error);
      return false;
    }
  }

  // Get conversation summary
  getConversationSummary() {
    const totalMessages = this.history.length;
    const userMessages = this.history.filter(m => m.type === 'user').length;
    const aiMessages = this.history.filter(m => m.type === 'ai').length;
    
    const firstMessage = this.history[0];
    const lastMessage = this.history[this.history.length - 1];
    
    return {
      totalMessages,
      userMessages,
      aiMessages,
      startTime: firstMessage?.timestamp,
      lastActivity: lastMessage?.timestamp,
      topics: this.extractTopics()
    };
  }

  // Extract topics from conversation
  extractTopics() {
    const topics = new Set();
    
    // Keywords to look for
    const topicKeywords = {
      recipes: ['recipe', 'cook', 'ingredient', 'instructions', 'servings'],
      events: ['event', 'party', 'retreat', 'meeting', 'gathering'],
      menus: ['menu', 'meal', 'breakfast', 'lunch', 'dinner'],
      allergies: ['allergy', 'allergic', 'gluten', 'dairy', 'nuts', 'dietary'],
      scaling: ['scale', 'servings', 'multiply', 'portion'],
      shopping: ['shopping', 'grocery', 'ingredients', 'buy', 'purchase']
    };
    
    this.history.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          topics.add(topic);
        }
      });
    });
    
    return Array.from(topics);
  }
}

// Create singleton instance
export const conversationHistory = new AIConversationHistory();