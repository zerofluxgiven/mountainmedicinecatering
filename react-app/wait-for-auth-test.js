// Firebase Auth Status Check with Proper Waiting
console.log('%c🔍 Checking Authentication Status...', 'font-size: 16px; color: #2196F3;');

// Method 1: Check current auth state
function checkAuthNow() {
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase not loaded. Are you on the Mountain Medicine Kitchen app?');
    return;
  }
  
  const user = firebase.auth().currentUser;
  if (user) {
    console.log('✅ Currently logged in as:', user.email);
    console.log('   User ID:', user.uid);
    runAITests();
  } else {
    console.log('⏳ Not logged in yet. Waiting for auth state...');
  }
}

// Method 2: Wait for auth state to settle
function waitForAuth() {
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase not loaded');
    return;
  }
  
  console.log('⏳ Waiting for authentication to initialize...');
  
  // Listen for auth state changes
  const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      console.log('✅ Authentication confirmed!');
      console.log('   Email:', user.email);
      console.log('   User ID:', user.uid);
      unsubscribe(); // Stop listening
      runAITests();
    } else {
      console.log('❌ No user logged in');
      console.log('   You should be redirected to login page');
      console.log('   If not, try going to: http://localhost:3000/login');
      unsubscribe();
    }
  });
}

// The actual AI tests
function runAITests() {
  console.log('\n%c🧪 Running AI Integration Tests...', 'font-size: 18px; color: #4CAF50;');
  
  // Test 1: Firestore
  firebase.firestore().collection('events').limit(1).get()
    .then(snap => {
      console.log('✅ Firestore working:', snap.size, 'event(s) found');
      if (!snap.empty) {
        console.log('   First event:', snap.docs[0].data().name);
      }
    })
    .catch(err => console.error('❌ Firestore error:', err));
  
  // Test 2: AI Chat
  firebase.auth().currentUser.getIdToken()
    .then(token => {
      console.log('✅ Got auth token');
      console.log('   Testing AI Chat service...');
      
      return fetch('https://us-central1-mountainmedicine-6e572.cloudfunctions.net/askAIHttp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: "Tell me a quick joke about cooking",
          context: { type: 'test', page: 'browser-test' }
        })
      });
    })
    .then(response => response.json())
    .then(data => {
      if (data.response) {
        console.log('✅ AI Chat working!');
        console.log('   Claude says:', data.response.substring(0, 100) + '...');
      } else {
        console.error('❌ AI Chat error:', data);
      }
      
      console.log('\n📋 Manual tests to try:');
      console.log('1. Click the purple AI chat bubble (bottom right)');
      console.log('2. Go to Recipes → Import Recipe');
      console.log('3. Test with a multi-section recipe');
    })
    .catch(err => console.error('❌ AI Chat test failed:', err));
}

// First check immediate state
checkAuthNow();

// If not logged in immediately, wait for auth
if (!firebase.auth().currentUser) {
  waitForAuth();
}

// Helper to manually check auth status
window.checkAuth = function() {
  const user = firebase.auth().currentUser;
  console.log('Current user:', user ? user.email : 'None');
  return user;
}

console.log('\n💡 Tip: You can run checkAuth() anytime to see current user');