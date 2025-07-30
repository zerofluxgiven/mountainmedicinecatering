import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AIChat from '../AI/AIChat';
import './Layout.css';

export default function Layout({ children }) {
  const { currentUser, logout, userRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Check if mobile on mount and set initial sidebar state
  const getInitialSidebarState = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  };
  
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarState());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Update sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

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
    { path: '/shopping-lists', label: 'Shopping Lists', icon: '🛒' },
    { path: '/ingredients', label: 'Ingredients', icon: '🥕' },
    { path: '/ai-history', label: 'AI History', icon: '📊' },
  ];

  // Add Settings for admin users
  if (hasRole('admin')) {
    navigationItems.push({ path: '/settings', label: 'Settings', icon: '⚙️' });
  }

  // Determine current context for AI
  const getAIContext = () => {
    const path = location.pathname;
    
    // Extract IDs from various routes
    if (path.includes('/events/') && params.id) {
      return { type: 'event', id: params.id };
    }
    if (path.includes('/recipes/') && params.id) {
      return { type: 'recipe', id: params.id };
    }
    if (path.includes('/menus/') && params.id) {
      return { type: 'menu', id: params.id };
    }
    if (path.includes('/ingredients/') && params.id) {
      return { type: 'ingredient', id: params.id };
    }
    
    // Page-level context
    if (path === '/events') return { type: 'page', page: 'events' };
    if (path === '/recipes') return { type: 'page', page: 'recipes' };
    if (path === '/menus') return { type: 'page', page: 'menus' };
    if (path === '/ingredients') return { type: 'page', page: 'ingredients' };
    if (path === '/') return { type: 'page', page: 'dashboard' };
    
    return { type: 'general' };
  };

  const aiContext = getAIContext();

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
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} style={{ backgroundColor: 'white', background: 'white' }}>
          <nav className="sidebar-nav">
            {navigationItems.map(item => (
              <Link 
                key={item.path}
                to={item.path} 
                className="nav-item"
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </aside>
        
        {/* Single Overlay for mobile - using isMobile state variable */}
        {sidebarOpen && isMobile && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
      
      {/* AI Chat - Available globally */}
      <AIChat context={aiContext} />
    </div>
  );
}