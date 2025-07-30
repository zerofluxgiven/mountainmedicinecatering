/**
 * Consolidate Menus Script
 * 
 * This script will:
 * 1. Find all menus in both collections
 * 2. Move any menus from 'menus' to 'menu_items' if they dont exist there
 * 3. Delete menus from 'menus' collection
 * 4. Handle duplicates intelligently
 * 
 * Run this in your browser console while logged in
 */

async function consolidateMenus() {
  console.log('[STARTING] Menu consolidation...\n');
  
  const { db, collection, getDocs, doc, setDoc, deleteDoc } = window._debugFirebase || {};
  if (!db) {
    console.error('[ERROR] Firebase not found. Make sure you are logged into the app');
    return;
  }
  
  try {
    // Get all menus from both collections
    const menuItemsSnap = await getDocs(collection(db, 'menu_items'));
    const menusSnap = await getDocs(collection(db, 'menus'));
    
    console.log('[STATUS] Current state:');
    console.log('   menu_items: ' + menuItemsSnap.size + ' documents');
    console.log('   menus: ' + menusSnap.size + ' documents\n');
    
    // Build a map of menus by event_id and name for deduplication
    const menuItemsMap = new Map();
    menuItemsSnap.forEach(doc => {
      const data = doc.data();
      const key = (data.event_id || 'standalone') + '_' + (data.name || 'unnamed');
      menuItemsMap.set(key, { id: doc.id, ...data, _source: 'menu_items' });
    });
    
    // Process menus from 'menus' collection
    let moved = 0;
    let deleted = 0;
    let skipped = 0;
    
    for (const menuDoc of menusSnap.docs) {
      const data = menuDoc.data();
      const key = (data.event_id || 'standalone') + '_' + (data.name || 'unnamed');
      
      console.log('\n[PROCESSING] "' + data.name + '" (' + menuDoc.id + ')');
      
      // Check if this menu already exists in menu_items
      if (menuItemsMap.has(key)) {
        const existing = menuItemsMap.get(key);
        console.log('   [WARNING] Duplicate found in menu_items');
        
        // Compare creation dates
        const existingDate = existing.created_at?.toDate?.() || new Date(0);
        const currentDate = data.created_at?.toDate?.() || new Date(0);
        
        if (currentDate > existingDate) {
          console.log('   [ACTION] This one is newer, replacing the one in menu_items');
          // Copy to menu_items with the same ID as the existing one
          await setDoc(doc(db, 'menu_items', existing.id), data);
          moved++;
        } else {
          console.log('   [SKIP] The one in menu_items is newer, skipping this one');
          skipped++;
        }
      } else {
        console.log('   [ACTION] Not found in menu_items, moving it');
        // Copy to menu_items with a new ID
        await setDoc(doc(db, 'menu_items', menuDoc.id), data);
        moved++;
      }
      
      // Delete from menus collection
      await deleteDoc(doc(db, 'menus', menuDoc.id));
      deleted++;
      console.log('   [DELETED] Removed from menus collection');
    }
    
    console.log('\n[COMPLETE] Consolidation finished!');
    console.log('   Moved: ' + moved + ' menus');
    console.log('   Deleted: ' + deleted + ' menus');
    console.log('   Skipped: ' + skipped + ' duplicates');
    
    // Final count
    const finalSnap = await getDocs(collection(db, 'menu_items'));
    console.log('\n[FINAL] State after consolidation:');
    console.log('   menu_items: ' + finalSnap.size + ' documents');
    console.log('   menus: 0 documents (cleaned)');
    
  } catch (error) {
    console.error('[ERROR] During consolidation:', error);
  }
}

// Add a helper to just view the current state without making changes
window.viewMenuState = async function() {
  const { db, collection, getDocs } = window._debugFirebase || {};
  if (!db) {
    console.error('[ERROR] Firebase not found');
    return;
  }
  
  const menuItemsSnap = await getDocs(collection(db, 'menu_items'));
  const menusSnap = await getDocs(collection(db, 'menus'));
  
  console.log('\n[LIST] All menus in menu_items:');
  menuItemsSnap.forEach(doc => {
    const data = doc.data();
    console.log('   - "' + data.name + '" (Event: ' + (data.event_id || 'none') + ') - ' + (data.created_at?.toDate?.() || 'no date'));
  });
  
  console.log('\n[LIST] All menus in menus:');
  menusSnap.forEach(doc => {
    const data = doc.data();
    console.log('   - "' + data.name + '" (Event: ' + (data.event_id || 'none') + ') - ' + (data.created_at?.toDate?.() || 'no date'));
  });
};

console.log('[LOADED] Menu Consolidation Script Ready!');
console.log('   Run: consolidateMenus() to move all menus to menu_items');
console.log('   Run: viewMenuState() to see current state without changes');