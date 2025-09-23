# TAR POS - Production Build Checklist

## Pre-Build Requirements

### 1. Environment Setup
- [ ] Verify all environment variables are set in `.env.production`
- [ ] Ensure sensitive credentials are not in `app.json`
- [ ] Confirm EAS project ID is correct in `app.json`

### 2. Code Quality
- [ ] Fix all TypeScript errors: `npm run type-check`
- [ ] Run linting: `npm run lint:fix`
- [ ] Run tests: `npm test`
- [ ] Verify app builds locally: `npm run prebuild:production`

### 3. App Configuration
- [ ] Update app version in `app.json`
- [ ] Verify app name, package name, and icons
- [ ] Check Android permissions are appropriate
- [ ] Confirm target SDK version (34)

### 4. Assets
- [ ] Verify all required assets exist:
  - [ ] `./assets/icon.png` (1024x1024)
  - [ ] `./assets/adaptive-icon.png` (1024x1024)
  - [ ] `./assets/splash.png` (1284x2778)
- [ ] Test app icons on different devices

## Build Process

### Development Build
```bash
npm run build:development
```

### Preview Build
```bash
npm run build:preview
```

### Production Build
```bash
npm run build:production
```

## Post-Build Verification

### 1. Test the Build
- [ ] Install and test the APK/AAB on physical device
- [ ] Verify all features work correctly
- [ ] Test offline functionality
- [ ] Verify database connections
- [ ] Test image upload to R2 storage

### 2. Performance Check
- [ ] App startup time < 3 seconds
- [ ] Smooth navigation between screens
- [ ] No memory leaks during extended use
- [ ] Proper error handling

### 3. Security Verification
- [ ] No sensitive data in logs
- [ ] API keys are properly secured
- [ ] Network requests use HTTPS
- [ ] User data is properly encrypted

## Deployment

### Google Play Store Preparation
1. Create service account key file (not in repo)
2. Configure Play Console
3. Submit for internal testing first

### Submit to Play Store
```bash
npm run submit:production
```

## Environment Variables Required

### Development (.env)
- `EXPO_PUBLIC_INSTANT_APP_ID`
- `EXPO_PUBLIC_R2_*` variables

### Production (.env.production)
- Same as development but with production values
- `NODE_ENV=production`

## Common Issues & Solutions

### Build Failures
1. **TypeScript errors**: Fix all type errors before building
2. **Missing assets**: Ensure all referenced assets exist
3. **Environment variables**: Verify all required env vars are set
4. **Dependencies**: Run `npm install` to ensure all deps are installed

### Runtime Issues
1. **Network errors**: Check API endpoints and credentials
2. **Storage issues**: Verify R2 configuration
3. **Database errors**: Confirm InstantDB app ID and permissions

## Security Notes

⚠️ **IMPORTANT**: Never commit these files to version control:
- `android-service-account.json`
- Any files containing API keys or secrets
- Production environment files with real credentials

## Build Commands Reference

```bash
# Clean and rebuild
npm run prebuild:production

# Build for different environments
npm run build:development    # Development build
npm run build:preview       # Preview build  
npm run build:production    # Production build

# Submit to stores
npm run submit:production   # Submit to Google Play
```