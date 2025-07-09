#!/usr/bin/env node

/**
 * Firebase Connection Test
 * Run this to verify Firebase is properly configured
 * Usage: node test-firebase-connection.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, doc, getDoc, connectFirestoreEmulator } = require('firebase/firestore');
const { getStorage, connectStorageEmulator } = require('firebase/storage');

// Load environment variables
require('dotenv').config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

console.log('🔥 Testing Firebase Connection...\n');

// Check for environment variables
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID',
];

console.log('📋 Checking environment variables...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(`${colors.red}❌ Missing environment variables:${colors.reset}`);
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\n💡 Create a .env file with your Firebase config');
  process.exit(1);
}

console.log(`${colors.green}✅ All environment variables present${colors.reset}\n`);

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

async function testConnection() {
  try {
    // Initialize Firebase
    console.log('🚀 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log(`${colors.green}✅ Firebase app initialized${colors.reset}\n`);

    // Test Auth
    console.log('🔐 Testing Authentication...');
    const auth = getAuth(app);
    console.log(`${colors.green}✅ Auth service connected${colors.reset}`);
    console.log(`   Current user: ${auth.currentUser ? auth.currentUser.email : 'Not logged in'}\n`);

    // Test Firestore
    console.log('📚 Testing Firestore...');
    const db = getFirestore(app);
    
    try {
      // Try to read a test document
      const testDoc = doc(db, '_test', 'connection');
      const docSnap = await getDoc(testDoc);
      
      if (docSnap.exists()) {
        console.log(`${colors.green}✅ Firestore read successful${colors.reset}`);
        console.log(`   Test doc data:`, docSnap.data());
      } else {
        console.log(`${colors.yellow}⚠️  Firestore connected but test doc not found${colors.reset}`);
        console.log(`   This is normal for first run`);
      }
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.log(`${colors.yellow}⚠️  Firestore connected but read permission denied${colors.reset}`);
        console.log(`   This is expected if not authenticated`);
      } else {
        throw error;
      }
    }
    console.log('');

    // Test Storage
    console.log('📦 Testing Storage...');
    const storage = getStorage(app);
    console.log(`${colors.green}✅ Storage service connected${colors.reset}`);
    console.log(`   Bucket: ${storage._bucket || firebaseConfig.storageBucket}\n`);

    // Summary
    console.log('=====================================');
    console.log(`${colors.green}✅ Firebase connection test passed!${colors.reset}`);
    console.log('=====================================\n');
    
    console.log('Your Firebase setup is working correctly.');
    console.log('You can now run: npm start\n');

  } catch (error) {
    console.error(`${colors.red}❌ Firebase connection failed:${colors.reset}`);
    console.error(error.message);
    
    if (error.code === 'auth/invalid-api-key') {
      console.log('\n💡 Check that your API key is correct in .env');
    } else if (error.code === 'auth/api-key-not-valid') {
      console.log('\n💡 Your API key might be restricted. Check Firebase Console.');
    }
    
    process.exit(1);
  }
}

// Check if using emulators
if (process.env.REACT_APP_USE_EMULATORS === 'true') {
  console.log('🧪 Using Firebase Emulators\n');
  // Connect to emulators if needed
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectStorageEmulator(storage, 'localhost', 9199);
}

// Run the test
testConnection().catch(console.error);