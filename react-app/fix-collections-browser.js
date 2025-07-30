/**
 * Browser Console Script to Fix Firebase Collections
 * 
 * INSTRUCTIONS:
 * 1. Open your React app in the browser
 * 2. Make sure you're logged in
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Follow the prompts
 */

// Check if Firebase is loaded
if (typeof window.firebase === 'undefined') {
  console.error('Firebase not loaded! Make sure you\'re on the Mountain Medicine Kitchen app.');
} else {
  console.log('🚀 Firebase Collection Diagnostic Tool');
  console.log('=====================================\n');
  
  // Import Firestore from the app's Firebase instance
  const { db } = await import('/src/config/firebase.js').catch(() => {
    console.log('Using global Firebase instance...');
    return { db: window.db };
  });
  
  const { collection, getDocs, doc, setDoc, deleteDoc, query, where } = await import('firebase/firestore');
  
  // Function to check collections
  async function checkCollections() {
    console.log('Checking for collections...\n');
    
    const collectionsToCheck = [
      'menus',
      'menu_items',
      'recipes',
      'events',
      'users',
      'ingredients',
      'vent_modifications',
      'event_modifications'
    ];
    
    const results = {};
    
    for (const collName of collectionsToCheck) {
      try {
        const snapshot = await getDocs(collection(db, collName));
        results[collName] = {
          exists: true,
          count: snapshot.size,
          sample: snapshot.size > 0 ? snapshot.docs[0].data() : null
        };
        console.log(`✅ ${collName}: ${snapshot.size} documents`);
      } catch (error) {
        results[collName] = {
          exists: false,
          error: error.message
        };
        console.log(`❌ ${collName}: ${error.message}`);
      }
    }
    
    return results;
  }
  
  // Function to check duplicate menus
  async function checkDuplicateMenus() {
    console.log('\n🔍 Checking for duplicate Luau Night menus...\n');
    
    try {
      // Try menus collection first
      let menuCollection = 'menus';
      let snapshot = await getDocs(collection(db, menuCollection));
      
      // If menus doesn't exist or is empty, try menu_items
      if (snapshot.size === 0) {
        console.log('No documents in "menus", checking "menu_items"...');
        menuCollection = 'menu_items';
        snapshot = await getDocs(collection(db, menuCollection));
      }
      
      const luauMenus = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('luau')) {
          luauMenus.push({
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || data.created_at
          });
        }
      });
      
      console.log(`Found ${luauMenus.length} Luau menus in ${menuCollection}:`);
      luauMenus.forEach((menu, i) => {
        console.log(`\n${i + 1}. ${menu.name}`);
        console.log(`   ID: ${menu.id}`);
        console.log(`   Created: ${menu.created_at}`);
        console.log(`   Event ID: ${menu.event_id || 'None'}`);
      });
      
      return { collection: menuCollection, menus: luauMenus };
    } catch (error) {
      console.error('Error checking menus:', error);
      return { error };
    }
  }
  
  // Function to show menu details
  window.showMenuDetails = async function(menuId, collectionName = 'menus') {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const menu = snapshot.docs.find(doc => doc.id === menuId);
      if (menu) {
        console.log('Menu details:', menu.data());
      } else {
        console.log('Menu not found');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  // Function to delete a menu
  window.deleteMenu = async function(menuId, collectionName = 'menus') {
    if (confirm(`Delete menu ${menuId} from ${collectionName}?`)) {
      try {
        await deleteDoc(doc(db, collectionName, menuId));
        console.log(`✅ Deleted menu ${menuId}`);
      } catch (error) {
        console.error('Error deleting menu:', error);
      }
    }
  };
  
  // Run diagnostics
  console.log('Running diagnostics...\n');
  const collectionResults = await checkCollections();
  const duplicateResults = await checkDuplicateMenus();
  
  // Show summary
  console.log('\n📊 SUMMARY:');
  console.log('===========\n');
  
  // Check for wrong collection names
  if (collectionResults.menu_items?.exists && !collectionResults.menus?.exists) {
    console.log('⚠️  ISSUE: Data is in "menu_items" but code expects "menus"');
    console.log('   This is why menus aren\'t showing in the app!');
  }
  
  if (collectionResults.vent_modifications?.exists) {
    console.log('⚠️  ISSUE: "vent_modifications" exists (should be "event_modifications")');
  }
  
  // Check for missing collections
  const requiredCollections = ['recipes', 'events', 'users'];
  for (const coll of requiredCollections) {
    if (!collectionResults[coll]?.exists) {
      console.log(`⚠️  MISSING: "${coll}" collection doesn't exist or has no permissions`);
    }
  }
  
  // Duplicate menus
  if (duplicateResults.menus && duplicateResults.menus.length > 1) {
    console.log(`\n⚠️  DUPLICATES: Found ${duplicateResults.menus.length} Luau menus`);
    console.log('   To delete a menu, use: deleteMenu("MENU_ID", "COLLECTION_NAME")');
  }
  
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Fix collection names in Firebase Console');
  console.log('2. Update Firestore security rules');
  console.log('3. Set Cloud Function permissions (see MANUAL_PERMISSIONS_GUIDE.md)');
  console.log('\nFor detailed menu info, use: showMenuDetails("MENU_ID", "COLLECTION_NAME")');
}