import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MealTypeSettings from '../../components/Settings/MealTypeSettings';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('meal-colors');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has admin privileges
    if (!hasRole('admin')) {
      navigate('/');
      return;
    }
    setLoading(false);
  }, [hasRole, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p className="settings-subtitle">Admin Configuration Panel</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'meal-colors' ? 'active' : ''}`}
              onClick={() => setActiveTab('meal-colors')}
            >
              <span className="nav-icon">🎨</span>
              <span className="nav-label">Meal Type Colors</span>
            </button>
            
            <button
              className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
              disabled
            >
              <span className="nav-icon">⚡</span>
              <span className="nav-label">General Settings</span>
              <span className="coming-soon">Coming Soon</span>
            </button>
            
            <button
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
              disabled
            >
              <span className="nav-icon">🔔</span>
              <span className="nav-label">Notifications</span>
              <span className="coming-soon">Coming Soon</span>
            </button>
            
            <button
              className={`settings-nav-item ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
              disabled
            >
              <span className="nav-icon">🔗</span>
              <span className="nav-label">Integrations</span>
              <span className="coming-soon">Coming Soon</span>
            </button>
          </nav>
        </div>

        <div className="settings-content">
          {activeTab === 'meal-colors' && <MealTypeSettings />}
          {activeTab === 'general' && (
            <div className="coming-soon-content">
              <h2>General Settings</h2>
              <p>General application settings will be available here soon.</p>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="coming-soon-content">
              <h2>Notification Settings</h2>
              <p>Configure email and in-app notifications.</p>
            </div>
          )}
          {activeTab === 'integrations' && (
            <div className="coming-soon-content">
              <h2>Third-Party Integrations</h2>
              <p>Connect with external services and APIs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}