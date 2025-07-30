/**
 * Browser Console Script to Diagnose Firebase Collections
 * 
 * INSTRUCTIONS:
 * 1. Open your Mountain Medicine Kitchen app in the browser
 * 2. Make sure you're logged in
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Follow the diagnostic output
 * 
 * NOTE: This script uses the Firebase instance already loaded by your app
 */

(async function() {
  console.log('🚀 Firebase Collection Diagnostic Tool');
  console.log('=====================================\n');
  
  // Try to find Firebase in the window object
  let db, collection, getDocs, doc, deleteDoc, query, where;
  
  // Check common places where Firebase might be stored
  if (window._firebase && window._firebase.db) {
    console.log('Found Firebase in window._firebase');
    db = window._firebase.db;
    ({ collection, getDocs, doc, deleteDoc, query, where } = window._firebase);
  } else {
    // Try to extract from React app
    console.log('Attempting to access Firebase through React DevTools...');
    
    // This is a fallback - you may need to manually set these
    console.warn('⚠️  Could not automatically find Firebase instance.');
    console.log('\nTo manually run diagnostics, you need to:');
    console.log('1. Find where your app stores the db instance');
    console.log('2. In React DevTools, look for a component that imports from firebase');
    console.log('3. Or check window object for any firebase-related properties\n');
    
    console.log('Try running: console.log(window)');
    console.log('And look for properties like: db, firebase, _firebase, etc.\n');
    
    // Provide manual diagnostic functions
    window.checkMenuCollection = async function() {
      console.log('Once you find the db instance, run:');
      console.log('const snapshot = await getDocs(collection(db, "menus"))');
      console.log('console.log("Menus:", snapshot.size)');
    };
    
    window.listCollections = function() {
      console.log('Common collections to check:');
      console.log('- menus (or menu_items)');
      console.log('- recipes');
      console.log('- events');
      console.log('- users');
      console.log('- vent_modifications (typo)');
    };
    
    return;
  }
  
  // Function to safely check a collection
  async function checkCollection(collName) {
    try {
      const snapshot = await getDocs(collection(db, collName));
      return {
        exists: true,
        count: snapshot.size,
        empty: snapshot.empty,
        sample: snapshot.size > 0 ? snapshot.docs[0].data() : null
      };
    } catch (error) {
      return {
        exists: false,
        error: error.code || error.message
      };
    }
  }
  
  // Run diagnostics
  console.log('🔍 Checking collections...\n');
  
  const collectionsToCheck = [
    'menus',
    'menu_items',
    'recipes',
    'events',
    'users',
    'ingredients',
    'vent_modifications',
    'event_modifications',
    'conversations',
    'files',
    'notifications'
  ];
  
  const results = {};
  
  for (const collName of collectionsToCheck) {
    const result = await checkCollection(collName);
    results[collName] = result;
    
    if (result.exists) {
      console.log(`✅ ${collName}: ${result.count} documents`);
    } else {
      console.log(`❌ ${collName}: ${result.error}`);
    }
  }
  
  // Analysis
  console.log('\n📊 ANALYSIS:');
  console.log('============\n');
  
  // Check for wrong collection names
  if (results.menu_items?.exists && results.menu_items.count > 0 && (!results.menus?.exists || results.menus.count === 0)) {
    console.log('⚠️  CRITICAL ISSUE: Your menu data is in "menu_items" but the app expects "menus"!');
    console.log('   This is why menus aren\'t showing in the app.');
    console.log('   Fix: Rename "menu_items" collection to "menus" in Firebase Console\n');
  }
  
  if (results.vent_modifications?.exists) {
    console.log('⚠️  TYPO FOUND: "vent_modifications" should be "event_modifications"');
    console.log('   Fix: Rename the collection in Firebase Console\n');
  }
  
  // Check for missing critical collections
  const critical = ['recipes', 'events', 'users'];
  const missing = critical.filter(c => !results[c]?.exists || results[c].error === 'permission-denied');
  
  if (missing.length > 0) {
    console.log('⚠️  MISSING/INACCESSIBLE COLLECTIONS:', missing.join(', '));
    console.log('   These might not exist or you might not have permissions.');
    console.log('   Fix: Check Firestore security rules\n');
  }
  
  // Look for specific menu duplicates
  if (results.menus?.exists || results.menu_items?.exists) {
    const menuColl = results.menus?.exists ? 'menus' : 'menu_items';
    console.log(`\n🔍 Checking for duplicate Luau Night menus in "${menuColl}"...`);
    
    try {
      const snapshot = await getDocs(collection(db, menuColl));
      const luauMenus = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('luau')) {
          luauMenus.push({
            id: doc.id,
            name: data.name,
            created_at: data.created_at?.toDate?.() || data.created_at || 'Unknown',
            event_id: data.event_id || 'None'
          });
        }
      });
      
      if (luauMenus.length > 1) {
        console.log(`\n⚠️  Found ${luauMenus.length} Luau menus:`);
        luauMenus.forEach((menu, i) => {
          console.log(`${i + 1}. ${menu.name} (ID: ${menu.id})`);
          console.log(`   Created: ${menu.created_at}`);
        });
        
        // Add helper function to window
        window.deleteMenu = async function(menuId) {
          if (confirm(`Delete menu ${menuId}?`)) {
            try {
              await deleteDoc(doc(db, menuColl, menuId));
              console.log(`✅ Deleted menu ${menuId}`);
            } catch (error) {
              console.error('Error:', error);
            }
          }
        };
        
        console.log('\n💡 To delete a menu, run: deleteMenu("MENU_ID")');
      } else if (luauMenus.length === 1) {
        console.log('✅ Only one Luau menu found - no duplicates');
      } else {
        console.log('No Luau menus found');
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }
  }
  
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Fix collection names in Firebase Console');
  console.log('2. Update Firestore security rules for missing collections');
  console.log('3. Check MANUAL_PERMISSIONS_GUIDE.md for Cloud Function fixes');
  
})();