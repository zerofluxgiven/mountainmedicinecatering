import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  
  // Global app state
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [events, setEvents] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get active event details
  const activeEvent = events.find(e => e.id === selectedEventId);

  // Load events
  useEffect(() => {
    if (!currentUser) {
      setEvents([]);
      return;
    }

    const q = query(
      collection(db, 'events'),
      where('deleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by start_date descending
      eventData.sort((a, b) => {
        const dateA = a.start_date?.toDate?.() || new Date(a.start_date);
        const dateB = b.start_date?.toDate?.() || new Date(b.start_date);
        return dateB - dateA;
      });

      setEvents(eventData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load recipes for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setRecipes([]);
      return;
    }

    // For now, load all recipes (later we can filter by event)
    const unsubscribe = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const recipeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort alphabetically
      recipeData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setRecipes(recipeData);
    });

    return () => unsubscribe();
  }, [selectedEventId]);

  // Load menus for selected event
  useEffect(() => {
    if (!selectedEventId) {
      setMenus([]);
      return;
    }

    const q = query(
      collection(db, 'menus'),
      where('event_id', '==', selectedEventId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMenus(menuData);
    });

    return () => unsubscribe();
  }, [selectedEventId]);

  const value = {
    // State
    selectedEventId,
    activeEvent,
    events,
    recipes,
    menus,
    loading,
    
    // Actions
    setSelectedEventId,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}