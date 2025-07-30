import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data from Firestore
  async function loadUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role || 'viewer');
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  // Sign up new user
  async function signup(email, password, name) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: user.email,
      name: name,
      role: 'user', // Default role - matches old app hierarchy
      created_at: new Date(),
      last_login: new Date()
    });

    return user;
  }

  // Sign in existing user
  async function login(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login
    await setDoc(doc(db, 'users', user.uid), {
      last_login: new Date()
    }, { merge: true });

    return user;
  }

  // Sign out
  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
    setUserRole(null);
  }

  // Check if user has required role
  function hasRole(requiredRole) {
    const roleHierarchy = {
      'admin': 4,
      'manager': 3,
      'user': 2,
      'viewer': 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up auth listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      
      try {
        if (user) {
          // Verify the user's token is still valid
          const token = await user.getIdToken();
          console.log('Got user token:', token ? 'Valid' : 'Invalid');
          
          setCurrentUser(user);
          const userData = await loadUserData(user.uid);
          
          // If we can't load user data, the user might be in a bad state
          if (!userData) {
            console.error('Failed to load user data, logging out');
            await logout();
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        // If token verification fails, clear the user
        setCurrentUser(null);
        setUserRole(null);
        
        // Try to sign out to clear any bad state
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error('Sign out error:', signOutError);
        }
      } finally {
        setLoading(false);
      }
    }, (error) => {
      // Handle auth errors
      console.error('Auth listener error:', error);
      setCurrentUser(null);
      setUserRole(null);
      setLoading(false);
    });

    // Add debug helper to window for testing
    if (process.env.NODE_ENV === 'development') {
      window.clearAuth = () => {
        console.log('Clearing auth...');
        logout();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      };
    }

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    signup,
    login,
    logout,
    hasRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}