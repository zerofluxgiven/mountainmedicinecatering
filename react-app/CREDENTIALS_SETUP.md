# Credentials Setup Guide

## ⚠️ Current Status: NO CREDENTIALS CONFIGURED

The application is set up to use environment variables, but **no actual credentials are currently configured**. You need to add them before the app will work properly.

## 🔐 Required Credentials

### 1. Firebase Configuration (Required)
Create a `.env.local` file in the root directory with:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 2. OpenAI API Key (For AI Features)
For Firebase Functions, set the config:

```bash
firebase functions:config:set openai.key="your-openai-api-key"
```

### 3. Google OAuth (Firebase Auth)
Google OAuth is configured through Firebase Console, not in code:
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google provider
3. Add authorized domains

## 📋 Step-by-Step Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Name it (e.g., "mountain-medicine-catering")
4. Enable Google Analytics (optional)

### Step 2: Get Firebase Config
1. In Firebase Console, click the gear icon > Project Settings
2. Scroll down to "Your apps" section
3. Click "Add app" > Web icon
4. Register app with a nickname
5. Copy the configuration object

### Step 3: Create .env.local
```bash
cd /Users/danmcfarland/Documents/mountainmedicinecatering/react-app
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:
```
REACT_APP_FIREBASE_API_KEY=AIzaSyD-XXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Step 4: Enable Firebase Services
In Firebase Console, enable:
1. **Authentication**
   - Enable Email/Password
   - Enable Google (optional)
   - Add your domain to authorized domains

2. **Firestore Database**
   - Create database in production mode
   - Choose a location close to your users

3. **Storage**
   - Set up Cloud Storage
   - Default bucket is fine

4. **Functions** (if deploying backend)
   - May require billing account

### Step 5: Set Up OpenAI (Optional, for AI features)
1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. For local development, add to `.env.local`:
   ```
   REACT_APP_OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXX
   ```
3. For production Functions:
   ```bash
   firebase functions:config:set openai.key="sk-XXXXXXXXXXXXXXXXXX"
   ```

### Step 6: Update Firebase Security Rules
Deploy the security rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```

### Step 7: Initialize Admin User
After first login:
1. Go to Firebase Console > Firestore
2. Find your user document in `users` collection
3. Add field: `role: "admin"`

## 🔍 Where Credentials Are Used

1. **Frontend (React App)**
   - `/src/config/firebase.js` - Reads from `process.env.REACT_APP_*`
   - Safe to expose Firebase config (not secret)

2. **Backend (Firebase Functions)**
   - `/functions/index.js` - Uses `functions.config()`
   - OpenAI key must be kept secret

3. **No Hardcoded Credentials**
   - ✅ All sensitive data in environment variables
   - ✅ `.env.local` is gitignored
   - ✅ Functions config stored in Firebase

## 🚨 Security Best Practices

1. **Never commit .env.local**
   - Already in .gitignore
   - Use .env.example as template

2. **Firebase Config is Public**
   - These values are safe to expose
   - Security comes from Firebase Rules

3. **Keep Secret Keys Secret**
   - OpenAI API key
   - Service account keys
   - Never put in frontend code

4. **Use Firebase Rules**
   - Already configured in `firestore.rules`
   - Enforces authentication and roles

## 🧪 Testing Without Real Firebase

For testing without Firebase:
1. Use Firebase Emulators
2. Run: `firebase emulators:start`
3. App will connect to local emulators

## 📝 Credential Checklist

- [ ] Firebase project created
- [ ] `.env.local` file created with Firebase config
- [ ] Authentication providers enabled
- [ ] Firestore database created
- [ ] Storage bucket configured
- [ ] Security rules deployed
- [ ] Admin user role set
- [ ] OpenAI API key configured (optional)
- [ ] Test authentication working

## 🆘 Troubleshooting

### "Firebase: No Firebase App '[DEFAULT]' has been created"
- Check `.env.local` exists and has values
- Restart development server after adding .env.local

### "Permission Denied" errors
- Check Firebase Security Rules
- Ensure user is authenticated
- Verify user role in Firestore

### "OpenAI API Error"
- Check API key is valid
- Ensure billing is set up on OpenAI
- Check Functions logs for errors

---

**IMPORTANT**: The application will not work properly until you add your Firebase credentials to `.env.local`!