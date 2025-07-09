import React, { useEffect, useState } from 'react';
import { auth } from '../../config/firebase';
import { GoogleAuthProvider } from 'firebase/auth';

export default function TestAuth() {
  const [config, setConfig] = useState({});
  const [authState, setAuthState] = useState('');

  useEffect(() => {
    // Check Firebase config
    const cfg = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? '✓ Set' : '✗ Missing',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'Missing',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'Missing',
    };
    setConfig(cfg);

    // Check auth state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthState(user ? `Logged in as: ${user.email}` : 'Not logged in');
    });

    return () => unsubscribe();
  }, []);

  const testGoogleAuth = () => {
    const provider = new GoogleAuthProvider();
    console.log('Auth domain:', process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
    console.log('Current URL:', window.location.origin);
    console.log('Provider:', provider);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>Firebase Auth Debug</h3>
      <div>
        <h4>Configuration:</h4>
        <pre>{JSON.stringify(config, null, 2)}</pre>
        <h4>Auth State:</h4>
        <p>{authState}</p>
        <h4>Current Origin:</h4>
        <p>{window.location.origin}</p>
        <button onClick={testGoogleAuth} style={{ marginTop: '10px' }}>
          Test Google Auth Config
        </button>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Check browser console for details when clicking the button
        </p>
      </div>
    </div>
  );
}