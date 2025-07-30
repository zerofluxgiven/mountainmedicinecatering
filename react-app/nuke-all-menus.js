/**
 * Nuclear Option - Delete ALL menus from both collections
 * Run this in your browser console while logged in
 */

async function nukeAllMenus() {
  console.log('[WARNING] This will delete ALL menus from both collections!');
  
  const { db, collection, getDocs, doc, deleteDoc } = window._debugFirebase || {};
  if (!db) {
    console.error('[ERROR] Firebase not found. Make sure you are logged into the app');
    return;
  }
  
  const confirm = window.confirm('Are you sure you want to delete ALL menus? This cannot be undone!');
  if (!confirm) {
    console.log('[CANCELLED] Operation cancelled by user');
    return;
  }
  
  try {
    // Get all menus from both collections
    const menuItemsSnap = await getDocs(collection(db, 'menu_items'));
    const menusSnap = await getDocs(collection(db, 'menus'));
    
    console.log('[STATUS] Found:');
    console.log('   menu_items: ' + menuItemsSnap.size + ' documents');
    console.log('   menus: ' + menusSnap.size + ' documents');
    console.log('   TOTAL: ' + (menuItemsSnap.size + menusSnap.size) + ' menus to delete\n');
    
    let deleted = 0;
    
    // Delete from menu_items
    console.log('[DELETING] From menu_items collection...');
    for (const docSnap of menuItemsSnap.docs) {
      await deleteDoc(doc(db, 'menu_items', docSnap.id));
      deleted++;
      console.log('   Deleted: ' + docSnap.data().name + ' (' + deleted + '/' + (menuItemsSnap.size + menusSnap.size) + ')');
    }
    
    // Delete from menus
    console.log('\n[DELETING] From menus collection...');
    for (const docSnap of menusSnap.docs) {
      await deleteDoc(doc(db, 'menus', docSnap.id));
      deleted++;
      console.log('   Deleted: ' + docSnap.data().name + ' (' + deleted + '/' + (menuItemsSnap.size + menusSnap.size) + ')');
    }
    
    console.log('\n[COMPLETE] Nuclear deletion finished!');
    console.log('   Total deleted: ' + deleted + ' menus');
    console.log('   Both collections are now empty');
    
  } catch (error) {
    console.error('[ERROR] During deletion:', error);
  }
}

// Quick check to see what we have
window.countMenus = async function() {
  const { db, collection, getDocs } = window._debugFirebase || {};
  if (!db) {
    console.error('[ERROR] Firebase not found');
    return;
  }
  
  const menuItemsSnap = await getDocs(collection(db, 'menu_items'));
  const menusSnap = await getDocs(collection(db, 'menus'));
  
  console.log('[COUNT] Current menus:');
  console.log('   menu_items: ' + menuItemsSnap.size);
  console.log('   menus: ' + menusSnap.size);
  console.log('   TOTAL: ' + (menuItemsSnap.size + menusSnap.size));
};

console.log('[LOADED] Nuclear Menu Deletion Script!');
console.log('   Run: countMenus() to see how many menus exist');
console.log('   Run: nukeAllMenus() to DELETE ALL MENUS');