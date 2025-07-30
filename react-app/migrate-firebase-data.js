#!/usr/bin/env node

/**
 * Firebase Data Migration Script
 * 
 * This script helps migrate data between collections and fix naming issues
 * 
 * IMPORTANT: You need to:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download service account key from Firebase Console
 * 3. Update the path to your service account key below
 */

const admin = require('firebase-admin');
const readline = require('readline');

// TODO: Update this path to your service account key
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mountainmedicine-6e572'
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Helper function to copy collection
async function copyCollection(sourceCollection, targetCollection, deleteSource = false) {
  console.log(`\n📋 Copying ${sourceCollection} → ${targetCollection}`);
  
  const sourceRef = db.collection(sourceCollection);
  const targetRef = db.collection(targetCollection);
  
  try {
    const snapshot = await sourceRef.get();
    console.log(`Found ${snapshot.size} documents in ${sourceCollection}`);
    
    if (snapshot.empty) {
      console.log('Source collection is empty, nothing to copy');
      return;
    }
    
    // Copy in batches
    let batch = db.batch();
    let batchCount = 0;
    let totalCopied = 0;
    
    for (const doc of snapshot.docs) {
      const targetDoc = targetRef.doc(doc.id);
      batch.set(targetDoc, doc.data());
      batchCount++;
      
      // Firestore limit is 500 operations per batch
      if (batchCount === 499) {
        await batch.commit();
        totalCopied += batchCount;
        console.log(`Progress: ${totalCopied}/${snapshot.size} documents copied...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      totalCopied += batchCount;
    }
    
    console.log(`✅ Successfully copied ${totalCopied} documents`);
    
    // Delete source if requested
    if (deleteSource) {
      const confirmDelete = await question(`Delete source collection '${sourceCollection}'? (yes/no): `);
      if (confirmDelete.toLowerCase() === 'yes') {
        await deleteCollection(sourceCollection);
        console.log(`🗑️  Deleted source collection '${sourceCollection}'`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error copying collection: ${error.message}`);
  }
}

// Helper function to delete collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const batchSize = 500;
  
  const query = collectionRef.orderBy('__name__').limit(batchSize);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();
  
  if (snapshot.size === 0) {
    resolve();
    return;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

// Main menu
async function main() {
  console.log('🚀 Firebase Data Migration Tool');
  console.log('================================\n');
  
  while (true) {
    console.log('\nWhat would you like to do?');
    console.log('1. Migrate menu_items → menus');
    console.log('2. Migrate menus → menu_items');
    console.log('3. Fix vent_modifications → event_modifications');
    console.log('4. List all collections');
    console.log('5. Count documents in a collection');
    console.log('6. Delete duplicate Luau Night menus');
    console.log('7. Exit');
    
    const choice = await question('\nEnter your choice (1-7): ');
    
    switch (choice) {
      case '1':
        await copyCollection('menu_items', 'menus');
        break;
        
      case '2':
        await copyCollection('menus', 'menu_items');
        break;
        
      case '3':
        await copyCollection('vent_modifications', 'event_modifications', true);
        break;
        
      case '4':
        await listCollections();
        break;
        
      case '5':
        const collName = await question('Enter collection name: ');
        await countDocuments(collName);
        break;
        
      case '6':
        await deleteDuplicateMenus();
        break;
        
      case '7':
        console.log('\nGoodbye!');
        rl.close();
        process.exit(0);
        
      default:
        console.log('Invalid choice, please try again');
    }
  }
}

async function listCollections() {
  console.log('\n📋 Listing all collections...');
  const collections = await db.listCollections();
  const names = collections.map(col => col.id);
  console.log('\nCollections found:');
  names.forEach(name => console.log(`  - ${name}`));
}

async function countDocuments(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    console.log(`\n📊 Collection '${collectionName}' has ${snapshot.size} documents`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function deleteDuplicateMenus() {
  console.log('\n🔍 Searching for duplicate Luau Night menus...');
  
  // Check both possible collections
  const collections = ['menus', 'menu_items'];
  
  for (const collName of collections) {
    console.log(`\nChecking ${collName}...`);
    
    try {
      const snapshot = await db.collection(collName).get();
      const luauMenus = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('luau')) {
          luauMenus.push({
            id: doc.id,
            name: data.name,
            created_at: data.created_at,
            event_id: data.event_id || 'None',
            collection: collName
          });
        }
      });
      
      if (luauMenus.length > 1) {
        console.log(`\nFound ${luauMenus.length} Luau menus in ${collName}:`);
        
        // Sort by creation date (newest first)
        luauMenus.sort((a, b) => {
          const dateA = a.created_at?.toDate?.() || new Date(0);
          const dateB = b.created_at?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        
        luauMenus.forEach((menu, index) => {
          const date = menu.created_at?.toDate?.() || 'Unknown';
          console.log(`\n${index + 1}. ${menu.name}`);
          console.log(`   ID: ${menu.id}`);
          console.log(`   Created: ${date}`);
          console.log(`   Event: ${menu.event_id}`);
        });
        
        const keep = await question('\nWhich menu number to keep? (Enter number or "skip"): ');
        
        if (keep !== 'skip' && !isNaN(keep)) {
          const keepIndex = parseInt(keep) - 1;
          if (keepIndex >= 0 && keepIndex < luauMenus.length) {
            // Delete all except the chosen one
            for (let i = 0; i < luauMenus.length; i++) {
              if (i !== keepIndex) {
                const menu = luauMenus[i];
                const confirm = await question(`Delete "${menu.name}" (${menu.id})? (yes/no): `);
                if (confirm.toLowerCase() === 'yes') {
                  await db.collection(menu.collection).doc(menu.id).delete();
                  console.log(`✅ Deleted menu ${menu.id}`);
                }
              }
            }
          }
        }
      } else if (luauMenus.length === 1) {
        console.log(`✅ Only one Luau menu found in ${collName} - no duplicates`);
      } else {
        console.log(`No Luau menus found in ${collName}`);
      }
    } catch (error) {
      console.log(`Could not access ${collName}: ${error.message}`);
    }
  }
}

// Run the script
main().catch(console.error);