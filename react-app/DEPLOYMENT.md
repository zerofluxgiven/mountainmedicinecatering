# Mountain Medicine Catering - Deployment Guide

## Prerequisites

1. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**
   - Create a project at https://console.firebase.google.com
   - Enable Authentication, Firestore, Storage, and Functions

3. **Environment Variables**
   Create `.env.local` in the root directory:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

## Initial Setup

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase (if not already done)**
   ```bash
   firebase init
   ```
   Select: Firestore, Functions, Hosting, Storage

3. **Update .firebaserc**
   Replace `your-project-id` with your actual Firebase project ID

4. **Install Dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Functions dependencies
   cd functions
   npm install
   cd ..
   ```

## Configuration

### 1. Firebase Functions Configuration

Set up OpenAI API key for recipe parsing:
```bash
firebase functions:config:set openai.key="your-openai-api-key"
```

### 2. Set up Admin User

After first deployment, manually add admin role to a user in Firestore:
1. Go to Firebase Console > Firestore
2. Find the user document in `users` collection
3. Add field: `role: "admin"`

### 3. Configure Email Service (Optional)

For production email notifications:
1. Set up SendGrid or similar service
2. Add API key to functions config:
   ```bash
   firebase functions:config:set sendgrid.key="your-sendgrid-key"
   ```

## Deployment

### Deploy Everything
```bash
npm run build
firebase deploy
```

### Deploy Specific Services
```bash
# Just hosting
npm run build
firebase deploy --only hosting

# Just functions
firebase deploy --only functions

# Just security rules
firebase deploy --only firestore:rules,storage:rules

# Specific function
firebase deploy --only functions:parseRecipe
```

## Testing

### Local Development
```bash
# Start React development server
npm start

# In another terminal, start Firebase emulators
firebase emulators:start
```

### Test Functions Locally
```bash
cd functions
npm run serve
```

## Production Checklist

- [ ] Environment variables are set
- [ ] Firebase project is configured
- [ ] Security rules are properly restrictive
- [ ] Functions have proper error handling
- [ ] CORS is configured for your domain
- [ ] SSL certificate is active
- [ ] Monitoring is set up
- [ ] Backup strategy is in place

## Monitoring

1. **Firebase Console**
   - Monitor usage at https://console.firebase.google.com
   - Check Functions logs
   - Review Firestore usage

2. **Error Tracking**
   Consider adding Sentry or similar:
   ```bash
   npm install @sentry/react
   ```

3. **Analytics**
   Firebase Analytics is included by default

## Troubleshooting

### Functions Not Deploying
- Check Node version (must be 18)
- Verify all dependencies are installed
- Check for syntax errors with `npm run lint`

### Authentication Issues
- Verify auth domain in Firebase Console
- Check authorized domains
- Ensure cookies are enabled

### CORS Errors
- Add your domain to authorized domains in Firebase Console
- Check Functions CORS configuration

### Storage Issues
- Verify storage rules
- Check file size limits
- Ensure proper authentication

## Maintenance

### Regular Tasks
1. Monitor usage and costs
2. Update dependencies monthly
3. Review and optimize Firestore indexes
4. Clean up old logs and temporary files

### Backup
1. Enable Firestore backups in Firebase Console
2. Regularly export data:
   ```bash
   gcloud firestore export gs://your-backup-bucket
   ```

## Rollback

If deployment fails:
```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

## Support

For issues:
1. Check Firebase Status: https://status.firebase.google.com
2. Review logs in Firebase Console
3. Check GitHub Issues for known problems