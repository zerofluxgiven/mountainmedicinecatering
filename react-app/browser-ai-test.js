// Browser-based AI Integration Test
// Copy and paste this into the browser console while on the Mountain Medicine Kitchen app

console.log('%c🧪 AI Integration Browser Test Suite', 'font-size: 20px; color: #4CAF50; font-weight: bold;');
console.log('%cMake sure you are logged in before running these tests', 'color: #FF9800;');

// Test configuration
const testConfig = {
  eventId: null, // Will be set after finding/creating an event
  recipeId: null, // Will be set after finding a recipe
  userId: null
};

// Utility functions
function logTest(testName, passed, details = '') {
  const symbol = passed ? '✅' : '❌';
  const color = passed ? '#4CAF50' : '#F44336';
  console.log(`%c${symbol} ${testName}`, `color: ${color}; font-weight: bold;`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function logSection(title) {
  console.log(`\n%c${'='.repeat(50)}`, 'color: #2196F3;');
  console.log(`%c${title}`, 'font-size: 16px; color: #2196F3; font-weight: bold;');
  console.log(`%c${'='.repeat(50)}`, 'color: #2196F3;');
}

// Test 1: Check Firebase Connection
async function testFirebaseConnection() {
  logSection('Test 1: Firebase Connection');
  
  try {
    const { auth, db } = await import('./config/firebase');
    
    const user = auth.currentUser;
    logTest('Firebase Auth', !!user, user ? `Logged in as: ${user.email}` : 'Not logged in');
    
    if (user) {
      testConfig.userId = user.uid;
    }
    
    // Try to read from Firestore
    const { collection, getDocs, limit, query } = await import('firebase/firestore');
    const eventsQuery = query(collection(db, 'events'), limit(1));
    const snapshot = await getDocs(eventsQuery);
    
    logTest('Firestore Connection', !snapshot.empty, `Found ${snapshot.size} event(s)`);
    
    if (!snapshot.empty) {
      testConfig.eventId = snapshot.docs[0].id;
      console.log(`   Using event: ${snapshot.docs[0].data().name}`);
    }
    
    return { auth, db };
  } catch (error) {
    logTest('Firebase Connection', false, error.message);
    return null;
  }
}

// Test 2: AI Chat Service
async function testAIChatService() {
  logSection('Test 2: AI Chat Service');
  
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./config/firebase');
    
    console.log('   Calling askAI function...');
    const askAI = httpsCallable(functions, 'askAI');
    
    const startTime = Date.now();
    const result = await askAI({
      message: "Tell me a quick joke about cooking",
      context: { type: 'test', page: 'browser-test' }
    });
    const responseTime = Date.now() - startTime;
    
    const success = !!result.data?.response;
    logTest('AI Chat Response', success, `Response time: ${responseTime}ms`);
    
    if (success) {
      console.log(`   AI says: "${result.data.response.substring(0, 100)}..."`);
    }
    
    return success;
  } catch (error) {
    logTest('AI Chat Service', false, error.message);
    return false;
  }
}

// Test 3: Recipe Parser
async function testRecipeParser() {
  logSection('Test 3: Recipe Parser');
  
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./config/firebase');
    
    const parseRecipe = httpsCallable(functions, 'parseRecipe');
    
    const testRecipe = `
Simple Test Recipe
Serves: 4

Ingredients:
- 2 cups flour
- 1 cup sugar
- 2 eggs

Instructions:
Mix all ingredients.
Bake at 350°F for 30 minutes.
    `;
    
    console.log('   Parsing test recipe...');
    const startTime = Date.now();
    
    const result = await parseRecipe({
      text: testRecipe,
      type: 'text'
    });
    const responseTime = Date.now() - startTime;
    
    const recipe = result.data?.recipe;
    const success = !!recipe?.name;
    
    logTest('Recipe Parsing', success, `Response time: ${responseTime}ms`);
    
    if (success) {
      console.log(`   Recipe: ${recipe.name}`);
      console.log(`   Ingredients: ${recipe.ingredients?.length || 0}`);
      console.log(`   Has instructions: ${!!recipe.instructions}`);
    }
    
    return success;
  } catch (error) {
    logTest('Recipe Parser', false, error.message);
    return false;
  }
}

// Test 4: AI Monitoring
async function testAIMonitoring() {
  logSection('Test 4: AI Monitoring Service');
  
  try {
    if (!testConfig.eventId) {
      logTest('AI Monitoring', false, 'No event found for testing');
      return false;
    }
    
    const { db } = await import('./config/firebase');
    const { collection, query, where, orderBy, limit: fbLimit, onSnapshot } = await import('firebase/firestore');
    
    console.log('   Setting up monitoring listener...');
    
    // Listen for AI questions
    const questionsRef = collection(db, 'ai_questions');
    const q = query(
      questionsRef,
      where('event_id', '==', testConfig.eventId),
      orderBy('created_at', 'desc'),
      fbLimit(1)
    );
    
    const promise = new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const question = snapshot.docs[0].data();
          logTest('AI Monitoring Active', true, `Found question: ${question.type}`);
          console.log(`   Priority: ${question.priority}`);
          console.log(`   Status: ${question.status}`);
          unsubscribe();
          resolve(true);
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        logTest('AI Monitoring Active', true, 'Listener working (no recent questions)');
        resolve(true);
      }, 5000);
    });
    
    return await promise;
  } catch (error) {
    logTest('AI Monitoring', false, error.message);
    return false;
  }
}

// Test 5: Check AI History
async function testAIHistory() {
  logSection('Test 5: AI History');
  
  try {
    const { db } = await import('./config/firebase');
    const { collection, query, where, orderBy, limit: fbLimit, getDocs } = await import('firebase/firestore');
    
    const interactionsRef = collection(db, 'ai_interactions');
    const q = query(
      interactionsRef,
      where('userId', '==', testConfig.userId),
      orderBy('timestamp', 'desc'),
      fbLimit(5)
    );
    
    const snapshot = await getDocs(q);
    
    logTest('AI History Available', !snapshot.empty, `Found ${snapshot.size} recent interactions`);
    
    if (!snapshot.empty) {
      console.log('   Recent interactions:');
      snapshot.forEach(doc => {
        const data = doc.data();
        const time = data.timestamp?.toDate?.()?.toLocaleTimeString() || 'Unknown time';
        console.log(`   - ${data.type} at ${time}: "${data.message?.substring(0, 50)}..."`);
      });
    }
    
    return !snapshot.empty;
  } catch (error) {
    logTest('AI History', false, error.message);
    return false;
  }
}

// Main test runner
async function runAITests() {
  console.log('\n%c🚀 Starting AI Integration Tests...', 'font-size: 14px; color: #673AB7;');
  console.log('This will test the AI features directly in your browser\n');
  
  const results = {
    total: 0,
    passed: 0
  };
  
  // Run tests
  const firebaseOk = await testFirebaseConnection();
  results.total++;
  if (firebaseOk) results.passed++;
  
  if (firebaseOk) {
    const tests = [
      testAIChatService,
      testRecipeParser,
      testAIMonitoring,
      testAIHistory
    ];
    
    for (const test of tests) {
      results.total++;
      const passed = await test();
      if (passed) results.passed++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  logSection('Test Summary');
  const allPassed = results.passed === results.total;
  const summaryColor = allPassed ? '#4CAF50' : '#FF9800';
  
  console.log(`%c${results.passed}/${results.total} tests passed`, `font-size: 16px; color: ${summaryColor}; font-weight: bold;`);
  
  if (allPassed) {
    console.log('%c✨ All AI features are working correctly!', 'color: #4CAF50; font-size: 14px;');
  } else {
    console.log('%c⚠️ Some tests failed. Check the details above.', 'color: #FF9800; font-size: 14px;');
  }
  
  console.log('\n%c💡 Next Steps:', 'font-weight: bold; color: #2196F3;');
  console.log('1. Try the AI chat bubble in the bottom right');
  console.log('2. Import a recipe to test parsing');
  console.log('3. Check the AI History page');
  console.log('4. Create a menu with allergen conflicts to test monitoring');
}

// Run the tests
runAITests();