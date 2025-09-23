#!/usr/bin/env node

/**
 * Production Build Validation Script
 * Validates that the app is ready for production build
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating TAR POS for production build...\n');

let hasErrors = false;
let hasWarnings = false;

function error(message) {
  console.log(`❌ ERROR: ${message}`);
  hasErrors = true;
}

function warning(message) {
  console.log(`⚠️  WARNING: ${message}`);
  hasWarnings = true;
}

function success(message) {
  console.log(`✅ ${message}`);
}

// Check required files
const requiredFiles = [
  'app.json',
  'eas.json',
  '.env.production',
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/splash.png'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success(`${file} exists`);
  } else {
    error(`Missing required file: ${file}`);
  }
});

// Check app.json configuration
console.log('\n📱 Validating app.json...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const expo = appJson.expo;
  
  if (expo.name && expo.name !== 'tar') {
    success(`App name: ${expo.name}`);
  } else {
    warning('App name should be more descriptive than "tar"');
  }
  
  if (expo.version) {
    success(`Version: ${expo.version}`);
  } else {
    error('Missing version in app.json');
  }
  
  if (expo.android?.package) {
    success(`Package: ${expo.android.package}`);
  } else {
    error('Missing Android package name');
  }
  
  if (expo.extra?.eas?.projectId) {
    success('EAS project ID configured');
  } else {
    error('Missing EAS project ID');
  }
  
  // Check for sensitive data in app.json
  const appJsonString = fs.readFileSync('app.json', 'utf8');
  if (appJsonString.includes('R2_SECRET_ACCESS_KEY') || 
      appJsonString.includes('SECRET') || 
      appJsonString.includes('KEY')) {
    error('Sensitive data found in app.json - move to environment variables');
  } else {
    success('No sensitive data in app.json');
  }
  
} catch (e) {
  error(`Invalid app.json: ${e.message}`);
}

// Check EAS configuration
console.log('\n🏗️  Validating eas.json...');
try {
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  
  if (easJson.build?.production) {
    success('Production build profile configured');
  } else {
    error('Missing production build profile in eas.json');
  }
  
  if (easJson.build?.production?.android?.buildType === 'aab') {
    success('Android App Bundle (AAB) configured for production');
  } else {
    warning('Consider using AAB for production builds');
  }
  
} catch (e) {
  error(`Invalid eas.json: ${e.message}`);
}

// Check environment variables
console.log('\n🔐 Validating environment variables...');
try {
  const envProd = fs.readFileSync('.env.production', 'utf8');
  
  const requiredEnvVars = [
    'EXPO_PUBLIC_INSTANT_APP_ID',
    'EXPO_PUBLIC_R2_ACCOUNT_ID',
    'EXPO_PUBLIC_R2_ACCESS_KEY_ID',
    'EXPO_PUBLIC_R2_SECRET_ACCESS_KEY',
    'EXPO_PUBLIC_R2_BUCKET_NAME',
    'EXPO_PUBLIC_R2_ENDPOINT'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (envProd.includes(envVar)) {
      success(`${envVar} configured`);
    } else {
      error(`Missing environment variable: ${envVar}`);
    }
  });
  
} catch (e) {
  error(`Cannot read .env.production: ${e.message}`);
}

// Check package.json scripts
console.log('\n📦 Validating package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredScripts = [
    'build:production',
    'type-check',
    'lint'
  ];
  
  requiredScripts.forEach(script => {
    if (packageJson.scripts?.[script]) {
      success(`Script "${script}" configured`);
    } else {
      warning(`Missing script: ${script}`);
    }
  });
  
} catch (e) {
  error(`Invalid package.json: ${e.message}`);
}

// Final summary
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.log('❌ Build validation FAILED - fix errors before building');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Build validation passed with warnings');
  console.log('🚀 Ready for production build (consider addressing warnings)');
} else {
  console.log('✅ Build validation PASSED');
  console.log('🚀 Ready for production build!');
}

console.log('\n📋 Next steps:');
console.log('1. Run: npm run type-check');
console.log('2. Run: npm run lint:fix');
console.log('3. Run: npm run build:production');