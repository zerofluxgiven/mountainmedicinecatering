import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration from environment variables or secrets
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Check if we're in private browsing mode
// In private mode, localStorage might not work properly
const isPrivateBrowsing = () => {
  try {
    const testKey = '_private_mode_test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return false;
  } catch (e) {
    return true;
  }
};

// Set auth persistence based on browsing mode
const persistence = isPrivateBrowsing() ? browserSessionPersistence : browserLocalPersistence;
setPersistence(auth, persistence).catch(error => {
  console.error('Error setting auth persistence:', error);
  // If persistence fails, try session persistence as fallback
  setPersistence(auth, browserSessionPersistence).catch(fallbackError => {
    console.error('Fallback persistence also failed:', fallbackError);
  });
});

// Helper to manually clear auth data (for debugging)
export function clearAuthData() {
  // Clear Firebase auth
  auth.signOut();
  // Clear localStorage
  localStorage.clear();
  // Clear sessionStorage
  sessionStorage.clear();
  // Reload to ensure clean state
  window.location.href = '/login';
}

// Connect to emulators in development
if (window.location.hostname === 'localhost' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  console.log('Connecting to Firebase emulators...');
  
  // Only connect if not already connected
  if (!window._firebaseEmulatorsConnected) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      window._firebaseEmulatorsConnected = true;
      console.log('Connected to Firebase emulators');
    } catch (error) {
      console.warn('Failed to connect to emulators:', error);
    }
  }
}

export default app;