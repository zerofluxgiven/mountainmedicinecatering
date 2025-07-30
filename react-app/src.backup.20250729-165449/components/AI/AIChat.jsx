import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiMonitor } from '../../services/aiMonitor';
// import { getSessionAIName, regenerateAIName } from '../../services/aiNameGenerator';
import { aiActionService } from '../../services/aiActionService';
import { aiActionServiceEnhanced } from '../../services/aiActionServiceEnhanced';
import { conversationHistory } from '../../services/aiConversationHistory';
import { parseRecipeFromAIResponse, detectRecipeInMessage, detectSaveIntent } from '../../services/aiRecipeParser';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../contexts/AuthContext';
import AIApprovalDialog from './AIApprovalDialog';
import ConversationSidebar from './ConversationSidebar';
import './AIChat.css';

export default function AIChat({ context }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    // Initialize with conversation history
    return conversationHistory.formatForDisplay();
  });
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState('assistant'); // 'assistant' or 'monitor'
  // const [aiName, setAiName] = useState('AI Sous Chef');
  const [pendingAction, setPendingAction] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Extract eventId from context if available
  const eventId = context?.type === 'event' ? context.id : null;

  // Set up approval callback on component mount
  useEffect(() => {
    aiActionServiceEnhanced.setApprovalCallback((action) => {
      setPendingAction(action);
    });
  }, []);

  useEffect(() => {
    // Set up AI monitoring for events
    if (eventId) {
      aiMonitor.startEventMonitoring(eventId);
      
      // Set up callback for new questions
      aiMonitor.setOnQuestionCallback(handleNewQuestion);
      
      // Load pending questions
      loadPendingQuestions();
      
      return () => {
        aiMonitor.stopEventMonitoring(eventId);
      };
    }
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize or get today's conversation on mount
  useEffect(() => {
    const initializeConversation = async () => {
      if (currentUser && !currentConversationId) {
        try {
          const convId = await conversationService.getTodaysConversation(
            currentUser.uid,
            currentUser.email
          );
          setCurrentConversationId(convId);
          console.log('Initialized conversation:', convId);
        } catch (error) {
          console.error('Error initializing conversation:', error);
        }
      }
    };
    
    initializeConversation();
  }, [currentUser, currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const showQuestion = useCallback((question) => {
    setCurrentQuestion(question);
    
    // Add AI message
    const aiMessage = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: question.question,
      options: question.options,
      questionId: question.id,
      timestamp: new Date()
    };
    
    setMessages(prev => {
      const newMessages = [...prev, aiMessage];
      conversationHistory.addMessage(aiMessage);
      return newMessages;
    });
    setUnreadCount(0);
  }, []);

  const loadPendingQuestions = useCallback(async () => {
    if (!eventId) return;
    
    const questions = await aiMonitor.getPendingQuestions(eventId);
    setPendingQuestions(questions);
    
    // Show first question if any
    if (questions.length > 0 && !currentQuestion) {
      setMode('monitor');
      showQuestion(questions[0]);
    }
  }, [eventId, currentQuestion, showQuestion]);

  const handleNewQuestion = useCallback((question) => {
    // Add to pending questions
    setPendingQuestions(prev => [...prev, question]);
    
    // Show immediately if no current question
    if (!currentQuestion) {
      setMode('monitor');
      showQuestion(question);
    } else {
      // Increment unread count
      setUnreadCount(prev => prev + 1);
    }
    
    // Open chat if closed
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [currentQuestion, isOpen, showQuestion]);

  const handleAnswer = async (questionId, answer) => {
    // Add user response to messages
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: answer.label || answer.action,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Submit answer
    await aiMonitor.answerQuestion(questionId, answer);
    
    // Remove from pending
    setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    
    // Show next question if any
    const remaining = pendingQuestions.filter(q => q.id !== questionId);
    if (remaining.length > 0) {
      setTimeout(() => showQuestion(remaining[0]), 1000);
    } else {
      setCurrentQuestion(null);
      setMode('assistant'); // Switch back to assistant mode
      
      // Add completion message
      const completionMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: 'Done! All questions handled. What fresh hell do you need help with now?',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, completionMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Store the message before clearing input, preserving newlines
    const messageToSend = inputValue.trim();
    console.log('Sending message:', messageToSend);
    console.log('Message length:', messageToSend.length);
    console.log('Message chars:', messageToSend.split('').map(c => c.charCodeAt(0)));

    // Check if message contains a recipe URL
    const urlMatch = messageToSend.match(/https?:\/\/[^\s]+/g);
    if (urlMatch && urlMatch.length > 0) {
      const url = urlMatch[0];
      if (aiActionService.isRecipeUrl(url)) {
        // Handle recipe URL import
        await handleRecipeUrlImport(url);
        return;
      }
    }

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      conversationHistory.addMessage(userMessage);
      return newMessages;
    });
    setInputValue('');
    setIsTyping(true);
    
    // Save message to Firestore if we have a conversation ID
    if (currentConversationId) {
      conversationService.addMessage(currentConversationId, 'user', messageToSend);
    }

    try {
      // Use HTTP endpoint temporarily due to CORS issues
      const auth = await import('../../config/firebase').then(m => m.auth);
      const token = await auth.currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageToSend,
          context: {
            ...context,
            page: window.location.pathname,
            eventId: eventId,
            conversationHistory: detectSaveIntent(messageToSend) ? [] : conversationHistory.getConversationContext(5)
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 529) {
          throw new Error('529: ' + (error.error || 'Service overloaded'));
        }
        throw new Error(error.error || 'Failed to call AI');
      }
      
      const data = await response.json();

      // Add AI response with metadata
      const aiMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: data.response,
        metadata: data.metadata, // Store content analysis metadata
        timestamp: new Date()
      };
      
      setMessages(prev => {
        const newMessages = [...prev, aiMessage];
        conversationHistory.addMessage(aiMessage);
        return newMessages;
      });
      
      // Save AI response to Firestore
      if (currentConversationId) {
        conversationService.addMessage(
          currentConversationId, 
          'assistant', 
          data.response,
          data.metadata || {}
        );
      }
      
      // Log detected content
      if (data.metadata?.detectedContent?.length > 0) {
        console.log('AI detected actionable content:', data.metadata.detectedContent);
        
        // Check if recipe was detected
        const recipeDetection = data.metadata.detectedContent.find(c => c.type === 'recipe');
        if (recipeDetection) {
          console.log(`Recipe pre-detected: "${recipeDetection.recipeName}" with ${recipeDetection.confidence * 100}% confidence`);
        }
      }
      
      // Check if user wants to save a recipe from the conversation
      console.log('Checking for save intent in message:', messageToSend);
      const hasSaveIntent = detectSaveIntent(messageToSend);
      console.log('Save intent detected:', hasSaveIntent);
      
      if (hasSaveIntent) {
        // Give the UI time to update before processing the save
        setTimeout(() => {
          console.log('Calling handleRecipeSaveIntent after timeout');
          handleRecipeSaveIntent(messageToSend, data.response, data.metadata);
        }, 500);
      }
    } catch (error) {
      console.error('Error calling AI:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack
      });
      
      // Add more informative error message
      let errorContent = 'Sorry, I encountered an error. ';
      
      if (error.code === 'unauthenticated') {
        errorContent = 'You need to be logged in to use the AI assistant.';
      } else if (error.code === 'functions/internal') {
        errorContent = 'The AI service is temporarily unavailable. Please try again later.';
      } else if (error.message?.includes('API key')) {
        errorContent = 'The AI service is not properly configured. Please contact support.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorContent = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('Load failed')) {
        errorContent = 'Failed to connect to AI service. Please try again in a moment.';
      } else if (error.message?.includes('529') || error.message?.includes('Overloaded')) {
        errorContent = 'The AI service is currently overloaded due to high demand. Please try again in a few minutes. (Error 529)';
      } else {
        errorContent += error.message || 'Please try again.';
      }
      
      const errorMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: errorContent,
        timestamp: new Date()
      };
      
      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        conversationHistory.addMessage(errorMessage);
        return newMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggle = () => {
    if (isOpen && !isMinimized) {
      // Close the window entirely to show the bubble again
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
      setUnreadCount(0);
      // Auto-focus input when opening
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };


  const handleRecipeUrlImport = async (url) => {
    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: url,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Add AI acknowledgment
    const ackMessage = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: `Oh great, another recipe URL. Let me see what garbage ${new URL(url).hostname} is trying to pass off as food...`,
      timestamp: new Date()
    };
    setMessages(prev => {
      const newMessages = [...prev, ackMessage];
      conversationHistory.addMessage(ackMessage);
      return newMessages;
    });

    try {
      // Use enhanced service with approval
      const result = await aiActionServiceEnhanced.importRecipeFromUrlWithApproval(url, {
        requested_by: 'chat',
        ai_name: 'AI Assistant'
      });

      if (result.success) {
        const recipe = result.recipe;
        const successMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Fine, I imported "${recipe.name}". \n\n• ${recipe.servings} servings\n• ${recipe.ingredients?.length || 0} ingredients\n• ${recipe.instructions?.length || 0} steps\n\nIt's in your collection now. Need anything else or are we done here?`,
          timestamp: new Date()
        };
        setMessages(prev => {
          const newMessages = [...prev, successMessage];
          conversationHistory.addMessage(successMessage);
          return newMessages;
        });
      } else {
        throw new Error(result.message || 'Failed to import recipe');
      }
    } catch (error) {
      console.error('Error importing recipe:', error);
      if (error.message !== 'Recipe import cancelled') {
        const errorMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Well, that was a waste of time. ${error.message || 'Failed to import that crap.'}\n\nEither their website sucks or their recipe isn't worth importing. Try copying the text like a normal person.`,
          timestamp: new Date()
        };
        setMessages(prev => {
          const newMessages = [...prev, errorMessage];
          conversationHistory.addMessage(errorMessage);
          return newMessages;
        });
      } else {
        const cancelMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Whatever. Import cancelled. What now?`,
          timestamp: new Date()
        };
        setMessages(prev => {
          const newMessages = [...prev, cancelMessage];
          conversationHistory.addMessage(cancelMessage);
          return newMessages;
        });
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionApproval = (approved) => {
    if (pendingAction) {
      aiActionServiceEnhanced.handleApproval(pendingAction.actionId, approved);
      setPendingAction(null);
    }
  };

  const handleActionReject = (reason) => {
    console.log('handleActionReject called with reason:', reason);
    if (pendingAction) {
      console.log('pendingAction exists, actionId:', pendingAction.actionId);
      if (reason === 'edit') {
        console.log('Edit button clicked - calling handleApproval with "edit"');
        aiActionServiceEnhanced.handleApproval(pendingAction.actionId, 'edit');
      } else {
        console.log('Other rejection - calling handleApproval with false');
        aiActionServiceEnhanced.handleApproval(pendingAction.actionId, false);
      }
      setPendingAction(null);
      
      if (reason === 'modify') {
        const modifyMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Fine. What do you want to change?`,
          timestamp: new Date()
        };
        setMessages(prev => {
          const newMessages = [...prev, modifyMessage];
          conversationHistory.addMessage(modifyMessage);
          return newMessages;
        });
      }
    }
  };

  const handleRecipeSaveIntent = async (userMessage, aiResponse, metadata) => {
    console.log('handleRecipeSaveIntent called');
    
    let recipeFound = null;
    let recipeMessage = null;
    
    // First, check if we have pre-parsed recipe data from metadata
    if (metadata?.parsedData?.recipe) {
      console.log('Using pre-parsed recipe from AI metadata!');
      recipeFound = metadata.parsedData.recipe;
      recipeMessage = aiResponse; // The AI response that contained the recipe
    } else if (metadata?.detectedContent?.some(c => c.type === 'recipe')) {
      // If AI detected a recipe but didn't parse it yet
      console.log('AI detected a recipe, attempting to parse from user message');
      recipeMessage = userMessage;
      recipeFound = parseRecipeFromAIResponse(userMessage);
    } else {
      // Check if the user's message itself contains the recipe
      // This handles cases where user pastes a recipe and says "save this"
      console.log('Checking if user message contains recipe...');
      const userHasRecipe = detectRecipeInMessage(userMessage);
      console.log('User message has recipe:', userHasRecipe);
      
      // NEW: If user is asking to save but detection failed, try parsing anyway
      if (userHasRecipe || detectSaveIntent(userMessage)) {
        console.log('Recipe found in user message OR user wants to save - attempting parse!');
        recipeMessage = userMessage;
        recipeFound = parseRecipeFromAIResponse(userMessage);
        console.log('Parsed recipe from user message:', recipeFound);
      }
      
      if (!recipeFound) {
        // Fallback to searching through recent messages
        console.log('No recipe in user message, searching conversation history...');
        
        const recentMessages = conversationHistory.getRecentMessages(10);
        console.log('Recent messages:', recentMessages.length);
        
        // Search backwards through messages for a recipe
        for (let i = recentMessages.length - 1; i >= 0; i--) {
          const msg = recentMessages[i];
          
          // Skip the current user message since we already checked it
          if (i === recentMessages.length - 1 && msg.content === userMessage) {
            continue;
          }
          
          // First check if message has metadata with pre-parsed recipe
          if (msg.metadata?.parsedData?.recipe) {
            console.log(`Found pre-parsed recipe in message ${i} metadata`);
            recipeFound = msg.metadata.parsedData.recipe;
            recipeMessage = msg.content;
            break;
          }
          
          // Otherwise try traditional detection
          console.log(`Checking message ${i}:`, msg.type || msg.role, 'Length:', msg.content.length);
          
          const hasRecipe = detectRecipeInMessage(msg.content);
          console.log('Recipe detection result:', hasRecipe);
          
          if (hasRecipe) {
            console.log('Recipe detected in message!');
            recipeMessage = msg.content;
            recipeFound = parseRecipeFromAIResponse(msg.content);
            console.log('Parsed recipe:', recipeFound);
            break;
          }
        }
      }
    }
    
    if (recipeFound && recipeFound.name) {
      console.log('Requesting approval for recipe:', recipeFound.name);
      try {
        // Use the enhanced service to request approval
        console.log('Calling createRecipeWithApproval...');
        const result = await aiActionServiceEnhanced.createRecipeWithApproval(recipeFound, {
          source: 'AI Chat',
          ai_generated: true,
          original_message: recipeMessage
        });
        
        console.log('createRecipeWithApproval result:', result);
        
        if (result.success) {
          // Don't add another message - the AI already acknowledged the save
          console.log(`Recipe "${recipeFound.name}" saved successfully`);
          
          // Check if user clicked edit button
          if (result.action === 'edit' && result.recipeId) {
            console.log('User wants to edit recipe, navigating to:', `/recipes/${result.recipeId}/edit`);
            // Navigate to recipe editor
            navigate(`/recipes/${result.recipeId}/edit`);
          }
        }
      } catch (error) {
        if (error.message === 'edit_requested') {
          // This shouldn't happen here since we handle it in the result
          console.log('Edit requested - this path should not be reached');
        } else if (error.message !== 'Recipe creation cancelled') {
          const errorMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: `Shit. Something went wrong saving that recipe: ${error.message}. You might need to add it manually.`,
            timestamp: new Date()
          };
          setMessages(prev => {
            const newMessages = [...prev, errorMessage];
            conversationHistory.addMessage(errorMessage);
            return newMessages;
          });
        }
      }
    } else {
      // No recipe found in recent messages
      console.log('No recipe found in recent messages');
      // Don't add another message - the AI already responded
    }
  };

  // Conversation Management Functions
  const handleNewConversation = async () => {
    try {
      conversationHistory.clearHistory();
      setMessages([]);
      
      const newConvId = await conversationService.createConversation(
        currentUser.uid,
        currentUser.email,
        { context: context }
      );
      
      setCurrentConversationId(newConvId);
      setConversationTitle('New Conversation');
      
      const welcomeMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `Fresh conversation started! What culinary adventure shall we embark on?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const handleSelectConversation = async (conversationId) => {
    try {
      setCurrentConversationId(conversationId);
      // Load messages from Firestore
      const unsubscribe = conversationService.subscribeToMessages(conversationId, (messages) => {
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date()
        }));
        setMessages(formattedMessages);
        conversationHistory.clearHistory();
        formattedMessages.forEach(msg => conversationHistory.addMessage(msg));
      });
      
      // Store unsubscribe function for cleanup
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const exportConversation = () => {
    const conversationData = {
      id: currentConversationId,
      title: conversationTitle,
      messages: messages,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(conversationData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `conversation-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const generateConversationTitle = useCallback(() => {
    if (messages.length > 1) {
      // Find first user message
      const firstUserMessage = messages.find(m => m.type === 'user');
      if (firstUserMessage) {
        // Take first 50 chars of user message as title
        const title = firstUserMessage.content.substring(0, 50) + 
                     (firstUserMessage.content.length > 50 ? '...' : '');
        setConversationTitle(title);
        
        // Update in Firestore if we have a conversation ID
        if (currentConversationId) {
          conversationService.updateConversationTitle(currentConversationId, title);
        }
      }
    }
  }, [messages, currentConversationId]);

  // Auto-generate title after first exchange
  useEffect(() => {
    if (messages.length === 2 && !conversationTitle) {
      generateConversationTitle();
    }
  }, [messages.length, conversationTitle, generateConversationTitle]);


  return (
    <>
      {/* Conversation Sidebar */}
      <ConversationSidebar
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Chat Button */}
      {(!isOpen || isMinimized) && (
        <button 
          className="ai-chat-button"
          onClick={handleToggle}
          aria-label="Open AI Assistant"
        >
          <span className="chat-icon">AI</span>
          {(unreadCount > 0 || pendingQuestions.length > 0) && (
            <span className="unread-badge">
              {unreadCount || pendingQuestions.length}
            </span>
          )}
        </button>
      )}

      {/* Overlay for click-outside */}
      {isOpen && !isMinimized && (
        <div className="ai-chat-overlay" onClick={() => {
          setIsOpen(false);
          setIsMinimized(false);
        }} />
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div className="ai-chat-window">
          {/* Left Sidebar Controls */}
          <div className="chat-sidebar-controls">
            <button 
              className="control-btn"
              onClick={() => setShowSidebar(!showSidebar)}
              aria-label="Conversation History"
              title="History"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </button>
            <button 
              className="control-btn"
              onClick={handleNewConversation}
              aria-label="New Conversation"
              title="New Chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>
            <button 
              className="control-btn"
              onClick={exportConversation}
              aria-label="Export Conversation"
              title="Export"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>
            <div className="sidebar-spacer"></div>
            <button 
              className="control-btn"
              onClick={() => {
                if (window.confirm('Clear all messages in this conversation?')) {
                  conversationHistory.clearHistory();
                  setMessages([]);
                }
              }}
              aria-label="Clear Messages"
              title="Clear"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear</span>
            </button>
          </div>

          {/* Main Chat Area */}
          <div className="chat-main">
            <div className="chat-header">
              <div className="header-content">
                <h2 className="chat-title">
                  {conversationTitle || 'AI Assistant'}
                </h2>
                {mode === 'monitor' && pendingQuestions.length > 0 && (
                  <span className="pending-badge">
                    {pendingQuestions.length} pending
                  </span>
                )}
              </div>
              <button 
                className="close-btn"
                onClick={handleClose}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

          <div className="chat-content">
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="welcome-message">
                    <h3>Oh look, another human needing help</h3>
                    <p>I'm your AI assistant - part genius, part chaos agent, and full-time smart-ass.</p>
                    <p>Ask me anything... seriously, I've heard it all. Need help? I'll get you sorted. Have a stupid question? I'll roast you first, then help you anyway.</p>
                    {conversationHistory.getAllMessages().length > 0 && (
                      <p className="history-note">I remember our {conversationHistory.getAllMessages().length} previous messages. Your secrets are safe with me!</p>
                    )}
                  </div>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`message ${message.type}`}
                    >
                      <div className="message-content">
                        {message.content}
                      </div>
                      
                      {message.options && (
                        <div className="message-options">
                          {message.options.map((option, index) => (
                            <button
                              key={index}
                              className="option-btn"
                              onClick={() => handleAnswer(message.questionId, option)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="message ai">
                    <div className="message-content typing">
                      <span>•</span><span>•</span><span>•</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {currentQuestion && currentQuestion.priority === 'high' && (
                <div className="priority-indicator high">
                  ⚠️ High priority issue
                </div>
              )}

              {/* Input area - show when not actively answering monitor questions */}
              {!currentQuestion && (
                <div className="chat-input-area">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter creates new line
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="chat-input"
                    rows="1"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    className="send-button"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      {pendingAction && (
        <AIApprovalDialog
          action={pendingAction}
          onApprove={() => handleActionApproval(true)}
          onReject={handleActionReject}
        />
      )}
    </>
  );
}