import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { events, recipes, menus } = useApp();

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start_date?.seconds * 1000 || event.start_date);
    return eventDate > new Date() && event.status !== 'completed';
  }).slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {currentUser?.email?.split('@')[0]}!</h1>
        <p className="dashboard-subtitle">
          Your catering command center
        </p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{events.length}</div>
            <div className="stat-label">Total Events</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-content">
            <div className="stat-value">{recipes.length}</div>
            <div className="stat-label">Recipes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-content">
            <div className="stat-value">{menus.length}</div>
            <div className="stat-label">Menus</div>
          </div>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn" onClick={() => navigate('/events/new')}>
              <span className="action-icon">📅</span>
              <span>Create Event</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/recipes/new')}>
              <span className="action-icon">📝</span>
              <span>Add Recipe</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/menus/new')}>
              <span className="action-icon">🍽️</span>
              <span>Create Menu</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/shopping-list')}>
              <span className="action-icon">📋</span>
              <span>Shopping List</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/export')}>
              <span className="action-icon">📄</span>
              <span>Export PDF</span>
            </button>
          </div>
      </div>

      {/* Upcoming Events */}
      <div className="upcoming-events">
        <h2>Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
          <div className="events-list">
            {upcomingEvents.map(event => {
              const eventDate = new Date(event.start_date?.seconds * 1000 || event.start_date);
              const daysUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={event.id} className="event-card">
                  <div className="event-info">
                    <h3>{event.name}</h3>
                    <p>{event.location}</p>
                    <p className="event-date">
                      {eventDate.toLocaleDateString()} • {event.guest_count} guests
                    </p>
                  </div>
                  <div className="event-countdown">
                    <div className="countdown-number">{daysUntil}</div>
                    <div className="countdown-label">days</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">No upcoming events</p>
        )}
      </div>
    </div>
  );
}