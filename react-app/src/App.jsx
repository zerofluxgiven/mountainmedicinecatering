import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';

// Placeholder pages - we'll create these next

function Events() {
  return <h2>Events - Coming Soon</h2>;
}

function Recipes() {
  return <h2>Recipes - Coming Soon</h2>;
}

function Menus() {
  return <h2>Menus - Coming Soon</h2>;
}

function Ingredients() {
  return <h2>Ingredients - Coming Soon</h2>;
}

function AIChat() {
  return <h2>AI Assistant - Coming Soon</h2>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/events" element={<Events />} />
                      <Route path="/recipes" element={<Recipes />} />
                      <Route path="/menus" element={<Menus />} />
                      <Route path="/ingredients" element={<Ingredients />} />
                      <Route path="/chat" element={<AIChat />} />
                    </Routes>
                  </Layout>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}