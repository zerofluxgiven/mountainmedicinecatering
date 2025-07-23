// AI Integration Test Script
// This script helps test the AI features systematically

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, limit } = require('firebase/firestore');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase config (replace with your actual config)
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
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Test configuration
const TEST_USER_EMAIL = 'test@mountainmedicine.com'; // Replace with your test user
const TEST_USER_PASSWORD = 'testpassword123'; // Replace with your test password

// Test data
const testRecipes = [
  {
    name: "Classic Chocolate Cake",
    ingredients: ["2 cups flour", "1 cup sugar", "1/2 cup cocoa powder", "1 cup milk", "2 eggs"],
    serves: 12,
    tags: ["dessert", "vegetarian"],
    allergens: ["gluten", "dairy", "eggs"]
  },
  {
    name: "Grilled Salmon",
    ingredients: ["4 salmon fillets", "2 tbsp olive oil", "1 lemon", "salt", "pepper"],
    serves: 4,
    tags: ["main", "pescatarian", "gluten-free"],
    allergens: ["fish"]
  }
];

const testEvent = {
  name: "Summer Wellness Retreat",
  start_date: "2025-08-15",
  end_date: "2025-08-18",
  guest_count: 45,
  allergens: ["gluten", "dairy", "nuts"],
  dietary_restrictions: ["vegan", "gluten-free"],
  guests_with_restrictions: [
    { name: "Sarah M.", allergies: ["gluten"], diet: "vegan" },
    { name: "John D.", allergies: ["dairy", "nuts"], diet: null }
  ]
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logTest(testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${testName}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Test functions
async function testAIChat() {
  logSection('Testing AI Chat Integration');
  
  try {
    // Test 1: Call askAI function
    log('\nTest 1: Testing AI Chat Function', 'cyan');
    const askAI = httpsCallable(functions, 'askAI');
    
    const testMessage = "What recipes are suitable for a gluten-free diet?";
    log(`Sending message: "${testMessage}"`);
    
    const startTime = Date.now();
    const result = await askAI({
      message: testMessage,
      context: {
        type: 'test',
        page: 'integration-test'
      }
    });
    const responseTime = Date.now() - startTime;
    
    const passed = result.data && result.data.response;
    logTest('AI Chat Response', passed, `Response time: ${responseTime}ms`);
    
    if (passed) {
      log(`AI Response: ${result.data.response.substring(0, 100)}...`, 'blue');
    }
    
    // Test 2: Check if interaction was logged
    log('\nTest 2: Checking AI Interaction Logging', 'cyan');
    
    // Wait a bit for the interaction to be logged
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Query AI interactions
    const interactionsRef = collection(db, 'ai_interactions');
    const q = query(
      interactionsRef,
      where('type', '==', 'chat'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const snapshot = await new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        unsubscribe();
        resolve(snapshot);
      });
    });
    
    const logged = !snapshot.empty;
    logTest('AI Interaction Logged', logged);
    
    if (logged) {
      const data = snapshot.docs[0].data();
      log(`  Message: ${data.message}`, 'blue');
      log(`  Response preview: ${data.response?.substring(0, 50)}...`, 'blue');
    }
    
  } catch (error) {
    logTest('AI Chat Test', false, `Error: ${error.message}`);
  }
}

async function testRecipeParsing() {
  logSection('Testing Recipe Parsing');
  
  try {
    // Test 1: Parse recipe from text
    log('\nTest 1: Testing Recipe Text Parsing', 'cyan');
    const parseRecipe = httpsCallable(functions, 'parseRecipe');
    
    const recipeText = `
Cowboy Caviar

Cowboy Caviar Ingredients:
• 1 pound Roma tomatoes, seeded and diced
• 1 15 ounce can black eyed peas, drained
• 1 15 ounce can black beans, drained
• 1 11 ounce can sweet corn, drained
• 1 red onion, diced
• 1 each green and red bell peppers, diced
• 1 cup cilantro, chopped

Zesty Dressing Ingredients:
• 1/4 cup olive oil
• 1/4 cup sugar
• 1/4 cup white wine vinegar
• 1 teaspoon chili powder
• 1 teaspoon salt

Instructions:
Combine all fresh salsa ingredients in a large bowl.
Whisk together all dressing ingredients.
Pour dressing over salsa and stir well.
Let sit for at least 15 minutes.
Serve with tortilla chips.
    `;
    
    log('Parsing multi-section recipe...');
    const startTime = Date.now();
    
    const result = await parseRecipe({
      text: recipeText,
      type: 'text'
    });
    
    const responseTime = Date.now() - startTime;
    const recipe = result.data?.recipe;
    
    const hasRecipe = !!recipe;
    const hasSections = recipe?.sections?.length > 0;
    const hasInstructions = recipe?.instructions?.length > 100;
    
    logTest('Recipe Parsed', hasRecipe, `Response time: ${responseTime}ms`);
    logTest('Sections Detected', hasSections, hasSections ? `Found ${recipe.sections.length} sections` : 'No sections found');
    logTest('Instructions Complete', hasInstructions, `Instructions length: ${recipe?.instructions?.length || 0} chars`);
    
    if (hasSections) {
      recipe.sections.forEach((section, i) => {
        log(`  Section ${i + 1}: ${section.label} (${section.ingredients.length} ingredients)`, 'blue');
      });
    }
    
  } catch (error) {
    logTest('Recipe Parsing Test', false, `Error: ${error.message}`);
  }
}

async function testEventParsing() {
  logSection('Testing Event Parsing');
  
  try {
    // Test 1: Parse event from text
    log('\nTest 1: Testing Event Text Parsing', 'cyan');
    const parseEventFlyer = httpsCallable(functions, 'parseEventFlyer');
    
    const eventText = `
Mountain Wellness Retreat

Join us for a transformative weekend of wellness and connection

Date: August 15-18, 2025
Time: 4:00 PM arrival - 2:00 PM departure
Location: Mountain Lodge Retreat Center
Address: 1234 Mountain View Road, Boulder, CO 80302

Capacity: 45 guests
Website: www.mountainwellnessretreat.com

Experience yoga, meditation, and farm-to-table cuisine in the beautiful Colorado mountains.
    `;
    
    log('Parsing event details...');
    const startTime = Date.now();
    
    // Convert text to base64 for the function
    const fileData = Buffer.from(eventText).toString('base64');
    
    const result = await parseEventFlyer({
      fileData: fileData,
      mimeType: 'text/plain'
    });
    
    const responseTime = Date.now() - startTime;
    const event = result.data?.event;
    
    const hasEvent = !!event;
    const hasName = !!event?.name;
    const hasDate = !!event?.event_date;
    const hasVenue = !!event?.venue;
    
    logTest('Event Parsed', hasEvent, `Response time: ${responseTime}ms`);
    logTest('Event Name Extracted', hasName, hasName ? `Name: ${event.name}` : '');
    logTest('Event Date Extracted', hasDate, hasDate ? `Date: ${event.event_date}` : '');
    logTest('Venue Extracted', hasVenue, hasVenue ? `Venue: ${event.venue}` : '');
    
    if (event) {
      log('\nExtracted Event Details:', 'yellow');
      Object.entries(event).forEach(([key, value]) => {
        if (value) {
          log(`  ${key}: ${value}`, 'blue');
        }
      });
    }
    
  } catch (error) {
    logTest('Event Parsing Test', false, `Error: ${error.message}`);
  }
}

async function testAIMonitoring() {
  logSection('Testing AI Monitoring Service');
  
  try {
    // Test 1: Create a test event with allergens
    log('\nTest 1: Creating Test Event with Allergens', 'cyan');
    
    const eventRef = await addDoc(collection(db, 'events'), {
      ...testEvent,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    logTest('Test Event Created', true, `Event ID: ${eventRef.id}`);
    
    // Test 2: Create a menu with conflicting recipe
    log('\nTest 2: Creating Menu with Allergen Conflict', 'cyan');
    
    const menuData = {
      event_id: eventRef.id,
      name: "Test Menu - Primary",
      type: "primary",
      days: [{
        date: "2025-08-15",
        day_label: "Day 1",
        meals: [{
          id: "meal_1",
          type: "dinner",
          courses: [{
            id: "course_1",
            name: "Classic Chocolate Cake",
            recipe_id: "test_recipe_1",
            allergens: ["gluten", "dairy", "eggs"], // Conflicts with event allergens
            servings: 45
          }]
        }]
      }],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const menuRef = await addDoc(collection(db, 'menus'), menuData);
    logTest('Test Menu Created', true, `Menu ID: ${menuRef.id}`);
    
    // Test 3: Check if monitoring question was created
    log('\nTest 3: Checking for AI Monitoring Questions', 'cyan');
    
    // Wait for triggers to fire
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const questionsRef = collection(db, 'ai_questions');
    const q = query(
      questionsRef,
      where('event_id', '==', eventRef.id),
      where('type', '==', 'menu_safety_check'),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    
    const snapshot = await new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        unsubscribe();
        resolve(snapshot);
      });
    });
    
    const hasQuestion = !snapshot.empty;
    logTest('AI Monitoring Question Created', hasQuestion);
    
    if (hasQuestion) {
      const question = snapshot.docs[0].data();
      log(`  Question: ${question.question?.substring(0, 100)}...`, 'blue');
      log(`  Priority: ${question.priority}`, 'blue');
      log(`  Context: ${JSON.stringify(question.context?.trigger)}`, 'blue');
    }
    
    // Cleanup
    log('\nCleaning up test data...', 'yellow');
    // In a real test, you would delete the test data here
    
  } catch (error) {
    logTest('AI Monitoring Test', false, `Error: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  log('\n🧪 Mountain Medicine Kitchen - AI Integration Test Suite', 'bright');
  log('Testing AI features in the production environment\n', 'yellow');
  
  try {
    // Authenticate
    log('Authenticating test user...', 'cyan');
    await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    logTest('Authentication', true, `Logged in as ${TEST_USER_EMAIL}`);
    
    // Run test suites
    await testAIChat();
    await testRecipeParsing();
    await testEventParsing();
    await testAIMonitoring();
    
    // Summary
    logSection('Test Summary');
    log('All tests completed!', 'green');
    log('\nNext Steps:', 'yellow');
    log('1. Check the Firebase Console for created test data');
    log('2. Open the app and verify AI features are working');
    log('3. Test the AI chat interface manually');
    log('4. Clean up any test data created');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
  }
  
  process.exit(0);
}

// Run tests
runTests();