import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import './EventList.css';

export default function EventList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'all', 'upcoming', 'past'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Subscribe to events - try start_date first (which is what the dashboard uses)
    const q = query(collection(db, 'events'), orderBy('start_date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Events snapshot received:', snapshot.size, 'documents');
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Events data:', eventsData);
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching events:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nameMatch = event.name?.toLowerCase().includes(search);
      const clientMatch = event.client_name?.toLowerCase().includes(search);
      const venueMatch = event.venue?.toLowerCase().includes(search);
      if (!nameMatch && !clientMatch && !venueMatch) return false;
    }

    // Date filter - check both event_date and start_date
    const dateField = event.event_date || event.start_date;
    const eventDate = dateField?.toDate?.() || new Date(dateField);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (filter === 'upcoming') {
      return eventDate >= now;
    } else if (filter === 'past') {
      return eventDate < now;
    }
    
    return true;
  });

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  const handleCreateNew = () => {
    navigate('/events/new');
  };


  const formatDate = (date) => {
    if (!date) return 'No date';
    const d = date.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventStatus = (event) => {
    const dateField = event.event_date || event.start_date;
    const eventDate = dateField?.toDate?.() || new Date(dateField);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (eventDate < now) return 'past';
    if (eventDate.toDateString() === now.toDateString()) return 'today';
    
    const daysUntil = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return 'soon';
    
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="event-list">
      <div className="event-list-header">
        <h1>Events</h1>
        {hasRole('user') && (
          <button 
            className="btn btn-primary"
            onClick={handleCreateNew}
          >
            <span className="btn-icon">➕</span>
            New Event
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="event-filters">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search events, clients, or venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Events
          </button>
          <button
            className={`filter-tab ${filter === 'past' ? 'active' : ''}`}
            onClick={() => setFilter('past')}
          >
            Past
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary">
        Showing {filteredEvents.length} {filter === 'all' ? '' : filter} events
      </div>

      {/* Events Grid */}
      <div className="events-grid">
        {filteredEvents.map(event => (
          <EventCard
            key={event.id}
            event={event}
            status={getEventStatus(event)}
            onClick={() => handleEventClick(event.id)}
            formatDate={formatDate}
          />
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="empty-state">
          <p>No events found.</p>
          {hasRole('user') && filter === 'upcoming' && (
            <button 
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              Create Your First Event
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Event Card Component
function EventCard({ event, status, onClick, formatDate }) {
  const getStatusClass = () => {
    switch (status) {
      case 'past': return 'status-past';
      case 'today': return 'status-today';
      case 'soon': return 'status-soon';
      default: return 'status-upcoming';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'past': return 'Past';
      case 'today': return 'Today!';
      case 'soon': return 'This Week';
      default: return 'Upcoming';
    }
  };

  return (
    <div className={`event-card ${getStatusClass()}`} onClick={onClick}>
      <div className="event-card-header">
        <span className={`event-status ${getStatusClass()}`}>
          {getStatusLabel()}
        </span>
      </div>
      
      <div className="event-card-body">
        <h3 className="event-name">{event.name || 'Unnamed Event'}</h3>
        
        <div className="event-details">
          <div className="event-detail">
            <span className="detail-icon">📅</span>
            <span>{formatDate(event.event_date || event.start_date)}</span>
          </div>
          
          {event.client_name && (
            <div className="event-detail">
              <span className="detail-icon">👤</span>
              <span>{event.client_name}</span>
            </div>
          )}
          
          {event.venue && (
            <div className="event-detail">
              <span className="detail-icon">📍</span>
              <span>{event.venue}</span>
            </div>
          )}
          
          <div className="event-detail">
            <span className="detail-icon">👥</span>
            <span>{event.guest_count || '?'} guests</span>
          </div>
          
          {event.website && (
            <div className="event-detail">
              <span className="detail-icon">🌐</span>
              <span>Has Website</span>
            </div>
          )}
        </div>

        {event.flyer_url && (
          <div className="event-flyer-indicator">
            📄 Has Flyer
          </div>
        )}

        {event.allergens && event.allergens.length > 0 && (
          <div className="event-allergens">
            {event.allergens.slice(0, 3).map(allergen => (
              <span key={allergen} className="allergen-tag">
                ⚠️ {allergen}
              </span>
            ))}
            {event.allergens.length > 3 && (
              <span className="allergen-tag">
                +{event.allergens.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}