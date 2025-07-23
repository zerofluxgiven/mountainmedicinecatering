import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './AIHistory.css';

export default function AIHistory() {
  const { currentUser } = useAuth();
  const [interactions, setInteractions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeInteractions;
    let unsubscribeQuestions;
    let unsubscribeEvents;

    const loadData = async () => {
      try {
        // Load interactions
        const interactionsQuery = query(
          collection(db, 'ai_interactions'),
          orderBy('timestamp', 'desc')
        );
        
        unsubscribeInteractions = onSnapshot(
          interactionsQuery, 
          (snapshot) => {
            const data = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date()
            }));
            setInteractions(data);
          },
          (error) => {
            console.log('No ai_interactions collection yet:', error);
            setInteractions([]);
          }
        );

        // Load questions
        const questionsQuery = query(
          collection(db, 'ai_questions'),
          orderBy('created_at', 'desc')
        );
        
        unsubscribeQuestions = onSnapshot(
          questionsQuery, 
          (snapshot) => {
            const data = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              created_at: doc.data().created_at?.toDate() || new Date(),
              answered_at: doc.data().answered_at?.toDate()
            }));
            setQuestions(data);
            setLoading(false);
          },
          (error) => {
            console.log('No ai_questions collection yet:', error);
            setQuestions([]);
            setLoading(false);
          }
        );

        // Load events
        const eventsQuery = query(collection(db, 'events'));
        unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name
          }));
          setEvents(data);
        });
      } catch (error) {
        console.error('Error loading AI history:', error);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeInteractions) unsubscribeInteractions();
      if (unsubscribeQuestions) unsubscribeQuestions();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, []);

  const filteredData = () => {
    let items = [];
    
    if (filter === 'all' || filter === 'questions') {
      items = [...items, ...questions.map(q => ({ ...q, itemType: 'question' }))];
    }
    
    if (filter === 'all' || filter === 'interactions') {
      items = [...items, ...interactions.map(i => ({ ...i, itemType: 'interaction' }))];
    }
    
    // Filter by event if selected
    if (selectedEvent !== 'all') {
      items = items.filter(item => 
        item.eventId === selectedEvent || 
        item.data?.eventId === selectedEvent ||
        item.context?.eventId === selectedEvent
      );
    }
    
    // Sort by date
    items.sort((a, b) => {
      const dateA = a.timestamp || a.created_at || new Date(0);
      const dateB = b.timestamp || b.created_at || new Date(0);
      return dateB - dateA;
    });
    
    return items;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderItem = (item) => {
    if (item.itemType === 'question') {
      return (
        <div key={`q-${item.id}`} className={`history-item question ${item.status}`}>
          <div className="item-header">
            <span className="item-type">Question</span>
            <span className={`priority-badge ${item.priority}`}>{item.priority}</span>
            <span className="item-date">{formatDate(item.created_at)}</span>
          </div>
          
          <div className="item-content">
            <p className="question-text">{item.question}</p>
            
            {item.status === 'answered' && item.answer && (
              <div className="answer-section">
                <strong>Answer:</strong> {item.answer.label || item.answer.action}
                <span className="answered-date"> • {formatDate(item.answered_at)}</span>
              </div>
            )}
            
            {item.context && (
              <div className="context-section">
                <details>
                  <summary>Context</summary>
                  <pre>{JSON.stringify(item.context, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div key={`i-${item.id}`} className="history-item interaction">
          <div className="item-header">
            <span className="item-type">AI Action</span>
            <span className="action-type">{item.type}</span>
            <span className="item-date">{formatDate(item.timestamp)}</span>
          </div>
          
          <div className="item-content">
            {item.type === 'question_answered' && (
              <p>Answered question: {item.data?.answer?.label || item.data?.answer?.action}</p>
            )}
            
            {item.type === 'conflict_detected' && (
              <p>Detected conflict: {item.data?.description}</p>
            )}
            
            {item.type === 'suggestion_made' && (
              <p>Made suggestion: {item.data?.suggestion}</p>
            )}
            
            {item.data && (
              <div className="data-section">
                <details>
                  <summary>Details</summary>
                  <pre>{JSON.stringify(item.data, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading AI history...</p>
      </div>
    );
  }

  const items = filteredData();

  return (
    <div className="ai-history">
      <div className="history-header">
        <h1>AI Assistant History</h1>
        <p className="subtitle">Track all AI interactions, questions, and actions</p>
      </div>

      <div className="history-filters">
        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="questions">Questions</option>
            <option value="interactions">AI Actions</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Event:</label>
          <select 
            value={selectedEvent} 
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>

        <div className="stats">
          <span className="stat">
            <strong>{questions.filter(q => q.status === 'pending').length}</strong> pending
          </span>
          <span className="stat">
            <strong>{questions.filter(q => q.status === 'answered').length}</strong> answered
          </span>
          <span className="stat">
            <strong>{interactions.length}</strong> actions
          </span>
        </div>
      </div>

      <div className="history-content">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No AI activity to display</p>
          </div>
        ) : (
          <div className="history-list">
            {items.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );
}