import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import './Layout.css';

export default function Layout({ children }) {
  const { currentUser, logout, userRole } = useAuth();
  const { selectedEventId, events, setSelectedEventId } = useApp();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEventChange = (e) => {
    setSelectedEventId(e.target.value);
  };

  const navigationItems = [
    { path: '/', label: '🏠 Dashboard', icon: '🏠' },
    { path: '/events', label: '📅 Events', icon: '📅' },
    { path: '/recipes', label: '📖 Recipes', icon: '📖' },
    { path: '/menus', label: '🍽️ Menus', icon: '🍽️' },
    { path: '/ingredients', label: '🥕 Ingredients', icon: '🥕' },
    { path: '/chat', label: '💬 AI Assistant', icon: '💬' },
  ];

  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1 className="app-title">Mountain Medicine Kitchen</h1>
        </div>
        
        <div className="header-center">
          {events.length > 0 && (
            <select 
              className="event-selector"
              value={selectedEventId || ''}
              onChange={handleEventChange}
            >
              <option value="">Select an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} ({new Date(event.start_date?.seconds * 1000 || event.start_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="header-right">
          <span className="user-info">
            {currentUser?.email} ({userRole})
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="layout-body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            {navigationItems.map(item => (
              <Link 
                key={item.path}
                to={item.path} 
                className="nav-item"
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {!selectedEventId && window.location.pathname !== '/events' && (
            <div className="event-warning">
              ⚠️ Please select an event to continue
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}