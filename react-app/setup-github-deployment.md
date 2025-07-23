# Setting Up GitHub Actions Deployment

Follow these steps to enable automatic deployment from GitHub to Firebase:

## 1. Create a Firebase Service Account

Run this command in your terminal:

```bash
firebase init hosting:github
```

This will:
- Create a service account for GitHub Actions
- Add the necessary secrets to your GitHub repository
- Set up the workflow files (we've already created them)

If that doesn't work, follow these manual steps:

## Manual Setup

### 1. Create Service Account Manually

```bash
# Login to Firebase
firebase login

# Set the project
firebase use mountainmedicine-6e572

# Create service account key
gcloud iam service-accounts create github-action-deploy \
  --display-name="GitHub Action Deploy"

gcloud projects add-iam-policy-binding mountainmedicine-6e572 \
  --member="serviceAccount:github-action-deploy@mountainmedicine-6e572.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=github-action-deploy@mountainmedicine-6e572.iam.gserviceaccount.com
```

### 2. Add Secret to GitHub

1. Go to your repository: https://github.com/zerofluxgiven/mountain-medicine-catering
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `FIREBASE_SERVICE_ACCOUNT`
5. Value: Copy the entire contents of `service-account-key.json`
6. Click "Add secret"

### 3. Delete the local service account key for security

```bash
rm service-account-key.json
```

## Testing the Deployment

Once you've added the secret, the deployment will trigger automatically on the next push to main.

You can also trigger it manually:
1. Go to the "Actions" tab in your GitHub repository
2. Select "Deploy to Firebase Hosting on merge"
3. Click "Run workflow"

## What These Workflows Do

### `firebase-hosting-merge.yml`
- Triggers on every push to the `main` branch
- Builds your React app
- Deploys it to Firebase Hosting

### `firebase-hosting-pull-request.yml`
- Triggers on pull requests
- Creates preview deployments
- Adds a comment to the PR with the preview URL

## Monitoring Deployments

Check the status at: https://github.com/zerofluxgiven/mountain-medicine-catering/actions

## Troubleshooting

If the deployment fails:
1. Check that the `FIREBASE_SERVICE_ACCOUNT` secret is set correctly
2. Ensure your Firebase project ID is correct in `.firebaserc`
3. Check the Actions logs for specific error messages