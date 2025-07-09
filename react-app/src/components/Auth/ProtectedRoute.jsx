import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../Loading/Loading';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser, hasRole, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Access Denied</h2>
        <p>You need {requiredRole} permissions to access this page.</p>
      </div>
    );
  }

  return children;
}