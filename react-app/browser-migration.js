/**
 * Browser-Based Migration Helper
 * Run this in your browser console while logged into the app
 * 
 * IMPORTANT: Make sure you're logged in first!
 */

// First, let's check what we're working with
async function checkCollections() {
  console.log('🔍 Checking your Firebase collections...\n');
  
  // Get Firebase from the app
  const { db } = window._debugFirebase || {};
  if (!db) {
    console.error('❌ Firebase not found. Make sure you added the debug code to App.jsx');
    return;
  }
  
  const { collection, getDocs, doc, deleteDoc } = window._debugFirebase;
  
  // Check menu collections
  try {
    const menuItemsSnap = await getDocs(collection(db, 'menu_items'));
    console.log(`📋 menu_items: ${menuItemsSnap.size} documents`);
    
    const menusSnap = await getDocs(collection(db, 'menus'));
    console.log(`📋 menus: ${menusSnap.size} documents`);
    
    // Find Luau Night duplicates
    const luauMenus = [];
    menuItemsSnap.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toLowerCase().includes('luau')) {
        luauMenus.push({ id: doc.id, ...data, _source: 'menu_items' });
      }
    });
    
    menusSnap.forEach(doc => {
      const data = doc.data();
      if (data.name && data.name.toLowerCase().includes('luau')) {
        luauMenus.push({ id: doc.id, ...data, _source: 'menus' });
      }
    });
    
    if (luauMenus.length > 0) {
      console.log(`\n🌺 Found ${luauMenus.length} Luau Night menus:`);
      luauMenus.forEach((menu, i) => {
        console.log(`${i + 1}. "${menu.name}" (ID: ${menu.id}) in ${menu._source}`);
        console.log(`   Created: ${menu.created_at?.toDate?.() || 'Unknown'}`);
      });
      
      // Store globally for easy deletion
      window._luauMenus = luauMenus;
      console.log('\n💡 To delete a menu, run: deleteMenu(index)');
      console.log('   Example: deleteMenu(2) to delete the second menu');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Helper function to delete a menu
window.deleteMenu = async function(index) {
  const { db, doc, deleteDoc } = window._debugFirebase;
  const menus = window._luauMenus;
  
  if (!menus || index < 1 || index > menus.length) {
    console.error('Invalid menu index');
    return;
  }
  
  const menu = menus[index - 1];
  if (confirm(`Delete "${menu.name}" from ${menu._source}?`)) {
    try {
      await deleteDoc(doc(db, menu._source, menu.id));
      console.log(`✅ Deleted menu ${menu.id}`);
      // Re-run check to update list
      checkCollections();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }
};

// Run the check
checkCollections();