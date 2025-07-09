# Update Firebase Functions Dependencies

## Steps to Update

1. **Update Firebase Functions SDK**
```bash
cd functions
npm install --save firebase-functions@latest
```

2. **Update Node.js Runtime**
Edit `functions/package.json`:
```json
"engines": {
  "node": "20"
}
```

3. **Redeploy Functions**
```bash
firebase deploy --only functions
```

## Benefits
- Avoid deprecation issues
- Access to latest Firebase Extensions features
- Better performance and security updates