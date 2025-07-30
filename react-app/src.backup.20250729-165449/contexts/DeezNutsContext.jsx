import React, { createContext, useContext, useState, useCallback } from 'react';
import DeezNutsNotification from '../components/DeezNuts/DeezNutsNotification';
import { detectNuts, getDeezNutsJoke, detectNutsInMultiple } from '../services/deezNutsService';

const DeezNutsContext = createContext();

export function useDeezNuts() {
  const context = useContext(DeezNutsContext);
  if (!context) {
    throw new Error('useDeezNuts must be used within DeezNutsProvider');
  }
  return context;
}

export function DeezNutsProvider({ children }) {
  const [notification, setNotification] = useState(null);
  
  // Check content and show joke if nuts detected
  const checkForNuts = useCallback((content, action = 'view') => {
    if (detectNuts(content)) {
      const joke = getDeezNutsJoke(action);
      setNotification(joke);
    }
  }, []);
  
  // Check multiple items (for menus, lists, etc.)
  const checkMultipleForNuts = useCallback((items, action = 'view') => {
    if (detectNutsInMultiple(items)) {
      const joke = getDeezNutsJoke(action);
      setNotification(joke);
    }
  }, []);
  
  // Manual trigger for custom messages
  const showNutJoke = useCallback((customMessage) => {
    setNotification(customMessage || getDeezNutsJoke('view'));
  }, []);
  
  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);
  
  const value = {
    checkForNuts,
    checkMultipleForNuts,
    showNutJoke
  };
  
  return (
    <DeezNutsContext.Provider value={value}>
      {children}
      {notification && (
        <DeezNutsNotification 
          message={notification} 
          onClose={closeNotification}
        />
      )}
    </DeezNutsContext.Provider>
  );
}