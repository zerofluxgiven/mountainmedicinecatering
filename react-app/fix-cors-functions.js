#!/usr/bin/env node

// Script to fix CORS issues by setting proper IAM permissions on HTTP functions
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PROJECT_ID = 'mountainmedicine-6e572';
const REGION = 'us-central1';

// Functions that need public access for CORS preflight
const HTTP_FUNCTIONS = [
  'aiCreateRecipeHttp',
  'aiCreateRecipeHttpPublic',
  'askAIHttp',
  'parseEventFlyerHTTP',
  'healthCheck'
];

async function setFunctionPermissions(functionName) {
  console.log(`\nSetting IAM permissions for ${functionName}...`);
  
  try {
    // First, check if function exists
    const checkCmd = `gcloud functions describe ${functionName} --region=${REGION} --project=${PROJECT_ID} --format="value(name)"`;
    const { stdout: checkResult } = await execPromise(checkCmd);
    
    if (!checkResult) {
      console.log(`❌ Function ${functionName} not found`);
      return;
    }
    
    // Add allUsers invoker permission
    const cmd = `gcloud functions add-iam-policy-binding ${functionName} \
      --region=${REGION} \
      --project=${PROJECT_ID} \
      --member="allUsers" \
      --role="roles/cloudfunctions.invoker"`;
    
    const { stdout, stderr } = await execPromise(cmd);
    
    if (stderr && !stderr.includes('Updated IAM policy')) {
      console.log(`⚠️  Warning for ${functionName}: ${stderr}`);
    } else {
      console.log(`✅ Successfully set permissions for ${functionName}`);
    }
    
  } catch (error) {
    console.error(`❌ Error setting permissions for ${functionName}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Fixing CORS issues for Firebase Functions...\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Functions to update: ${HTTP_FUNCTIONS.join(', ')}\n`);
  
  // Check if gcloud is installed
  try {
    await execPromise('gcloud --version');
  } catch (error) {
    console.error('❌ gcloud CLI not found. Please install the Google Cloud SDK.');
    process.exit(1);
  }
  
  // Check current project
  try {
    const { stdout: currentProject } = await execPromise('gcloud config get-value project');
    if (currentProject.trim() !== PROJECT_ID) {
      console.log(`⚠️  Current gcloud project is ${currentProject.trim()}, switching to ${PROJECT_ID}...`);
      await execPromise(`gcloud config set project ${PROJECT_ID}`);
    }
  } catch (error) {
    console.error('❌ Error checking gcloud project:', error.message);
  }
  
  // Process each function
  for (const functionName of HTTP_FUNCTIONS) {
    await setFunctionPermissions(functionName);
  }
  
  console.log('\n✅ Done! CORS preflight requests should now work properly.');
  console.log('\nNote: It may take a few minutes for the changes to propagate.');
  console.log('\nTo test, run:');
  console.log(`curl -X OPTIONS https://${REGION}-${PROJECT_ID}.cloudfunctions.net/aiCreateRecipeHttp \\`);
  console.log('  -H "Origin: http://localhost:3000" \\');
  console.log('  -H "Access-Control-Request-Method: POST" \\');
  console.log('  -H "Access-Control-Request-Headers: authorization,content-type" -v');
}

main().catch(console.error);