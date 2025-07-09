import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const { currentUser, logout, userRole } = useAuth();
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

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/events', label: 'Events', icon: '📅' },
    { path: '/recipes', label: 'Recipes', icon: '📖' },
    { path: '/menus', label: 'Menus', icon: '🍽️' },
    { path: '/ingredients', label: 'Ingredients', icon: '🥕' },
    { path: '/chat', label: 'AI Assistant', icon: '💬' },
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
          <img 
            src="/mountain_logo_longer.png" 
            alt="Mountain Medicine" 
            className="header-logo"
          />
        </div>
        
        <div className="header-center">
          {/* Event selector removed - will be replaced with event planning dashboard */}
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
          {children}
        </main>
      </div>
    </div>
  );
}