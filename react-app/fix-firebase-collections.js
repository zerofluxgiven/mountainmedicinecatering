#!/usr/bin/env node

/**
 * Firebase Collection Migration Script
 * Fixes collection naming issues and creates missing collections
 * 
 * Run with: node fix-firebase-collections.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin with service account
// You'll need to download your service account key from Firebase Console
// Project Settings -> Service Accounts -> Generate New Private Key
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

async function listCollections() {
  console.log('\n📋 Listing all collections in your Firebase project...\n');
  const collections = await db.listCollections();
  const collectionNames = collections.map(col => col.id);
  console.log('Found collections:', collectionNames);
  return collectionNames;
}

async function checkForProblematicCollections(collections) {
  console.log('\n🔍 Checking for problematic collections...\n');
  
  const issues = [];
  
  // Check for typos
  if (collections.includes('vent_modifications')) {
    issues.push({
      type: 'typo',
      collection: 'vent_modifications',
      shouldBe: 'event_modifications',
      action: 'rename'
    });
  }
  
  // Check for wrong names
  if (collections.includes('menu_items')) {
    issues.push({
      type: 'wrong_name',
      collection: 'menu_items',
      shouldBe: 'menus',
      action: 'rename'
    });
  }
  
  // Check for missing collections
  const requiredCollections = [
    'menus',
    'recipes', 
    'events',
    'users',
    'ingredients',
    'accommodation_menus',
    'meal_types',
    'ai_monitoring',
    'allergens',
    'dietary_restrictions'
  ];
  
  for (const required of requiredCollections) {
    if (!collections.includes(required)) {
      issues.push({
        type: 'missing',
        collection: required,
        action: 'create'
      });
    }
  }
  
  return issues;
}

async function countDocuments(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.size;
}

async function renameCollection(oldName, newName) {
  console.log(`\n📝 Renaming collection: ${oldName} -> ${newName}`);
  
  const oldCollection = db.collection(oldName);
  const newCollection = db.collection(newName);
  
  // Get all documents from old collection
  const snapshot = await oldCollection.get();
  const docCount = snapshot.size;
  
  if (docCount === 0) {
    console.log(`  ⚠️  Collection '${oldName}' is empty, skipping...`);
    return;
  }
  
  console.log(`  📊 Found ${docCount} documents to migrate`);
  
  // Batch write to new collection
  let batch = db.batch();
  let batchCount = 0;
  let totalMigrated = 0;
  
  for (const doc of snapshot.docs) {
    const newDocRef = newCollection.doc(doc.id);
    batch.set(newDocRef, doc.data());
    batchCount++;
    
    // Firestore has a limit of 500 operations per batch
    if (batchCount === 499) {
      await batch.commit();
      totalMigrated += batchCount;
      console.log(`  ✅ Migrated ${totalMigrated}/${docCount} documents...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  // Commit remaining documents
  if (batchCount > 0) {
    await batch.commit();
    totalMigrated += batchCount;
  }
  
  console.log(`  ✅ Successfully migrated ${totalMigrated} documents`);
  
  // Ask before deleting old collection
  const deleteOld = await question(`  Delete old collection '${oldName}'? (yes/no): `);
  if (deleteOld.toLowerCase() === 'yes') {
    await deleteCollection(oldName);
    console.log(`  🗑️  Deleted old collection '${oldName}'`);
  }
}

async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.orderBy('__name__').limit(500);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
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
  
  // Recurse on the next process tick, to avoid exploding the stack
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function createSampleData(collectionName) {
  console.log(`\n📄 Creating sample document in '${collectionName}'...`);
  
  const sampleData = {
    _sample: true,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    description: `Sample document to initialize ${collectionName} collection`
  };
  
  await db.collection(collectionName).doc('_sample').set(sampleData);
  console.log(`  ✅ Created sample document in '${collectionName}'`);
}

async function fixDuplicateMenus() {
  console.log('\n🔍 Checking for duplicate Luau Night menus...\n');
  
  const menusCollection = db.collection('menus');
  const snapshot = await menusCollection.where('name', '>=', 'Luau Night').where('name', '<=', 'Luau Night\uf8ff').get();
  
  if (snapshot.size > 1) {
    console.log(`Found ${snapshot.size} menus with "Luau Night" in the name:`);
    
    const menus = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      menus.push({
        id: doc.id,
        name: data.name,
        created_at: data.created_at?.toDate() || 'Unknown',
        event_id: data.event_id || 'No event'
      });
    });
    
    // Sort by creation date
    menus.sort((a, b) => {
      if (a.created_at === 'Unknown') return 1;
      if (b.created_at === 'Unknown') return -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    console.log('\nMenus found:');
    menus.forEach((menu, index) => {
      console.log(`  ${index + 1}. ${menu.name} (ID: ${menu.id})`);
      console.log(`     Created: ${menu.created_at}`);
      console.log(`     Event: ${menu.event_id}`);
    });
    
    console.log('\nKeeping the most recent menu and removing duplicates...');
    const keepMenu = menus[0];
    const deleteMenus = menus.slice(1);
    
    for (const menu of deleteMenus) {
      const confirmDelete = await question(`  Delete menu "${menu.name}" (${menu.id})? (yes/no): `);
      if (confirmDelete.toLowerCase() === 'yes') {
        await menusCollection.doc(menu.id).delete();
        console.log(`  🗑️  Deleted duplicate menu ${menu.id}`);
      }
    }
  } else {
    console.log('  ✅ No duplicate Luau Night menus found');
  }
}

async function main() {
  console.log('🚀 Firebase Collection Migration Script');
  console.log('=====================================\n');
  
  try {
    // Step 1: List all collections
    const collections = await listCollections();
    
    // Step 2: Check for issues
    const issues = await checkForProblematicCollections(collections);
    
    if (issues.length === 0) {
      console.log('\n✅ No collection issues found!');
      rl.close();
      return;
    }
    
    console.log(`\n⚠️  Found ${issues.length} issues:\n`);
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}: ${issue.collection}`);
      if (issue.shouldBe) {
        console.log(`   Should be: ${issue.shouldBe}`);
      }
    });
    
    const proceed = await question('\nProceed with fixes? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      rl.close();
      return;
    }
    
    // Step 3: Fix issues
    for (const issue of issues) {
      if (issue.action === 'rename') {
        await renameCollection(issue.collection, issue.shouldBe);
      } else if (issue.action === 'create') {
        const create = await question(`\nCreate missing collection '${issue.collection}'? (yes/no): `);
        if (create.toLowerCase() === 'yes') {
          await createSampleData(issue.collection);
        }
      }
    }
    
    // Step 4: Fix duplicate menus
    const fixDuplicates = await question('\nCheck and fix duplicate menus? (yes/no): ');
    if (fixDuplicates.toLowerCase() === 'yes') {
      await fixDuplicateMenus();
    }
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

// Run the migration
main();