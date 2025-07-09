import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import ChatMessage from '../../components/Chat/ChatMessage';
import ChatInput from '../../components/Chat/ChatInput';
import SuggestedPrompts from '../../components/Chat/SuggestedPrompts';
import './AIChat.css';

export default function AIChat() {
  const { currentUser } = useAuth();
  const { selectedEventId, events, recipes, menus } = useApp();
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    // Create or load conversation
    initializeConversation();
  }, [currentUser]);

  useEffect(() => {
    // Subscribe to messages if we have a conversation
    if (!conversationId) return;

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageData);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [conversationId]);

  const initializeConversation = async () => {
    try {
      // Create new conversation
      const conversationData = {
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        context: {
          eventId: selectedEventId,
          eventCount: events.length,
          recipeCount: recipes.length,
          menuCount: menus.length
        }
      };

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      setConversationId(docRef.id);

      // Add welcome message
      await addMessage('assistant', getWelcomeMessage(), docRef.id);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const getWelcomeMessage = () => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    
    if (selectedEvent) {
      return `Hello! I'm your AI assistant for Mountain Medicine Catering. I see you're currently planning for "${selectedEvent.name}". How can I help you with this event today?`;
    }
    
    return `Hello! I'm your AI assistant for Mountain Medicine Catering. I can help you with:
• Recipe suggestions and modifications
• Menu planning and pairing ideas
• Dietary restrictions and allergen management
• Event planning tips
• Ingredient substitutions
• Scaling recipes for different guest counts

What would you like to know?`;
  };

  const addMessage = async (role, content, conversationIdOverride = null) => {
    const convId = conversationIdOverride || conversationId;
    if (!convId) return;

    try {
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        role,
        content,
        timestamp: serverTimestamp()
      });

      // Update conversation last message time
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const handleSendMessage = async (message) => {
    if (!message.trim() || thinking) return;

    setThinking(true);

    try {
      // Add user message
      await addMessage('user', message);

      // Get AI response
      const response = await getAIResponse(message);
      
      // Add AI response
      await addMessage('assistant', response);
    } catch (error) {
      console.error('Error sending message:', error);
      await addMessage('assistant', 'I apologize, but I encountered an error. Please try again.');
    } finally {
      setThinking(false);
    }
  };

  const getAIResponse = async (message) => {
    // Build context for the AI
    const context = buildContext();
    
    try {
      // Call Firebase Function
      const chatAssistant = httpsCallable(functions, 'chatAssistant');
      const result = await chatAssistant({
        message,
        conversationId,
        eventContext: context
      });
      
      return result.data.response;
    } catch (error) {
      console.error('AI response error:', error);
      // Fallback to mock response if function fails
      return getMockResponse(message, context);
    }
  };

  const buildContext = () => {
    const selectedEvent = events.find(e => e.id === selectedEventId);
    const eventMenus = menus.filter(m => m.event_id === selectedEventId);
    
    return {
      selectedEvent,
      eventMenus,
      totalRecipes: recipes.length,
      recentRecipes: recipes.slice(0, 5).map(r => r.name),
      hasAllergyData: selectedEvent?.allergens?.length > 0
    };
  };

  const getMockResponse = (message, context) => {
    const lowerMessage = message.toLowerCase();
    
    // Context-aware responses
    if (context.selectedEvent) {
      if (lowerMessage.includes('menu') || lowerMessage.includes('suggest')) {
        const menuCount = context.eventMenus.length;
        if (menuCount === 0) {
          return `I notice you haven't created any menus yet for ${context.selectedEvent.name}. Would you like me to suggest a menu based on the event type and guest count of ${context.selectedEvent.guest_count || 'unknown'} guests?

Some popular menu combinations include:
• Appetizers: 3-4 options
• Main courses: 2-3 options (including vegetarian)
• Sides: 2-3 options
• Desserts: 2 options

What type of cuisine or style are you considering?`;
        } else {
          return `You have ${menuCount} menu${menuCount > 1 ? 's' : ''} created for ${context.selectedEvent.name}. Would you like me to:
• Review your current menu selections
• Suggest complementary dishes
• Help with portion planning for ${context.selectedEvent.guest_count || 'your'} guests
• Create a shopping list

What would be most helpful?`;
        }
      }
      
      if (lowerMessage.includes('allergen') || lowerMessage.includes('allergy')) {
        if (context.hasAllergyData) {
          const allergens = context.selectedEvent.allergens.join(', ');
          return `For ${context.selectedEvent.name}, you have the following allergens to consider: ${allergens}.

I can help you:
• Find recipes that avoid these allergens
• Suggest substitutions for existing recipes
• Create allergen-free versions of popular dishes
• Generate allergy warnings for your menus

What specific allergen concerns would you like to address?`;
        } else {
          return `I don't see any allergen information recorded for ${context.selectedEvent.name} yet. 

Would you like to:
• Add guest allergy information
• Get suggestions for common allergen-free options
• Learn about allergen labeling best practices

Recording allergies helps ensure guest safety and satisfaction.`;
        }
      }
    }
    
    // Recipe-related responses
    if (lowerMessage.includes('recipe')) {
      if (lowerMessage.includes('scale') || lowerMessage.includes('portion')) {
        return `I can help you scale recipes for different guest counts. To scale a recipe effectively:

1. **Identify the original serving size** - Check the recipe's current yield
2. **Calculate the scaling factor** - Divide desired servings by original servings
3. **Adjust ingredients proportionally** - Multiply each ingredient by the factor
4. **Consider cooking adjustments**:
   • Cooking times may need adjustment for larger batches
   • Seasoning often doesn't scale linearly (taste as you go)
   • Baking recipes may need to be made in multiple batches

Which recipe would you like to scale, and for how many guests?`;
      }
      
      return `You currently have ${context.totalRecipes} recipes in your collection. Some recent additions include: ${context.recentRecipes.join(', ')}.

I can help you:
• Find recipes by ingredient or cuisine type
• Suggest recipe modifications
• Create shopping lists from recipes
• Import new recipes from URLs or text

What would you like to do with recipes?`;
    }
    
    // Default helpful response
    return `I understand you're asking about "${message}". 

As your catering assistant, I can help with:
• Menu planning and recipe suggestions
• Dietary restrictions and substitutions  
• Event timeline planning
• Portion calculations
• Shopping list generation
• Recipe scaling

Could you provide more details about what you're looking for?`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSuggestedPrompt = (prompt) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <h1>AI Catering Assistant</h1>
        {selectedEventId && (
          <div className="event-context">
            <span className="context-label">Planning for:</span>
            <span className="context-value">
              {events.find(e => e.id === selectedEventId)?.name}
            </span>
          </div>
        )}
      </div>

      <div className="chat-container">
        {messages.length === 0 && !loading ? (
          <div className="welcome-container">
            <div className="welcome-icon">🤖</div>
            <h2>Welcome to your AI Assistant!</h2>
            <p>I'm here to help with all your catering needs.</p>
            <SuggestedPrompts onSelectPrompt={handleSuggestedPrompt} />
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                isUser={message.role === 'user'}
              />
            ))}
            {thinking && (
              <div className="thinking-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="thinking-text">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={thinking || !conversationId}
        placeholder={thinking ? "AI is thinking..." : "Ask me anything about catering..."}
      />
    </div>
  );
}