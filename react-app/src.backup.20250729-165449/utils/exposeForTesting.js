// Expose Firebase for browser console testing in development
import { auth, db, storage, functions } from '../config/firebase';

if (process.env.NODE_ENV === 'development') {
  // Expose Firebase services to window for testing
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  window.firebaseStorage = storage;
  window.firebaseFunctions = functions;
  
  // Helper functions for testing
  window.testUtils = {
    getCurrentUser: () => auth.currentUser,
    
    checkAuth: () => {
      const user = auth.currentUser;
      if (user) {
        console.log('✅ Logged in as:', user.email);
        console.log('   User ID:', user.uid);
        return user;
      } else {
        console.log('❌ Not logged in');
        return null;
      }
    },
    
    runAITest: async () => {
      const user = auth.currentUser;
      if (!user) {
        console.error('Not logged in! Cannot test AI.');
        return;
      }
      
      try {
        const token = await user.getIdToken();
        console.log('✅ Got auth token');
        
        const response = await fetch('https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: "Tell me a quick joke about cooking",
            context: { type: 'test' }
          })
        });
        
        const data = await response.json();
        console.log('✅ AI Response:', data.response);
      } catch (error) {
        console.error('❌ AI test failed:', error);
      }
    },
    
    listEvents: async () => {
      try {
        const snapshot = await db.collection('events').limit(5).get();
        console.log(`Found ${snapshot.size} events:`);
        snapshot.forEach(doc => {
          console.log('-', doc.data().name);
        });
      } catch (error) {
        console.error('Error listing events:', error);
      }
    }
  };
  
  console.log('%c🛠️ Test utilities loaded!', 'color: #4CAF50; font-weight: bold');
  console.log('Available commands:');
  console.log('  testUtils.checkAuth()     - Check login status');
  console.log('  testUtils.runAITest()     - Test AI chat');
  console.log('  testUtils.listEvents()    - List events');
  console.log('  firebaseAuth.currentUser  - Direct auth access');
}