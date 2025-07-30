import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '../config/collections';
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
  const [events, setEvents] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Load all recipes
  useEffect(() => {
    if (!currentUser) {
      setRecipes([]);
      return;
    }

    // Load all recipes regardless of selected event
    const unsubscribe = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      console.log('Recipes snapshot received:', snapshot.size, 'documents');
      const recipeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort alphabetically
      recipeData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setRecipes(recipeData);
    }, (error) => {
      console.error('Error loading recipes:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load all menus
  useEffect(() => {
    if (!currentUser) {
      setMenus([]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.MENUS), (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMenus(menuData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const value = {
    // State
    events,
    recipes,
    menus,
    loading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}