// Conversation Management Service
// Manages multiple conversations with proper isolation

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

class ConversationService {
  constructor() {
    this.activeConversations = new Map();
  }

  // Create a new conversation
  async createConversation(userId, userEmail, metadata = {}) {
    try {
      const conversationData = {
        userId,
        userEmail,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        messageCount: 0,
        status: 'active',
        metadata: {
          ...metadata,
          source: 'web_app'
        }
      };

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Get user's conversations
  async getUserConversations(userId, limitCount = 10) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        orderBy('lastMessageAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // Subscribe to conversation messages
  subscribeToMessages(conversationId, callback) {
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });
  }

  // Add message to conversation
  async addMessage(conversationId, role, content, metadata = {}) {
    try {
      // Add the message
      const messageData = {
        role,
        content,
        timestamp: serverTimestamp(),
        metadata
      };

      await addDoc(
        collection(db, 'conversations', conversationId, 'messages'), 
        messageData
      );

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessageAt: serverTimestamp(),
        messageCount: increment(1)
      });

      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      return false;
    }
  }

  // Get conversation context for AI (limited history)
  async getConversationContext(conversationId, messageLimit = 10) {
    try {
      const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(messageLimit)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs
        .map(doc => ({
          role: doc.data().role,
          content: doc.data().content
        }))
        .reverse(); // Reverse to get chronological order

      return messages;
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  // Mark conversation as ended
  async endConversation(conversationId) {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  }

  // Get or create today's conversation
  async getTodaysConversation(userId, userEmail) {
    try {
      // Check for an active conversation from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        where('createdAt', '>=', today),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create new conversation for today
      return await this.createConversation(userId, userEmail);
    } catch (error) {
      console.error('Error getting today\'s conversation:', error);
      // Fallback to creating new
      return await this.createConversation(userId, userEmail);
    }
  }

  // Update conversation title
  async updateConversationTitle(conversationId, title) {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        'metadata.title': title,
        lastUpdatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  }

  // Clear local cache for a conversation
  clearConversationCache(conversationId) {
    this.activeConversations.delete(conversationId);
  }

  // Search conversations
  async searchConversations(userId, searchTerm) {
    try {
      // This is a simplified search - in production you'd want full-text search
      const conversations = await this.getUserConversations(userId, 50);
      
      // For now, we'll just return all conversations and let the UI filter
      // In a real app, you'd implement proper search indexing
      return conversations;
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();