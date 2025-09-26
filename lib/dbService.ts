import { init } from '@instantdb/react-native';
import { getTenantAppId, storeTenantAppId } from './secureStorage';
import { getTenantAppIdFromProfile } from './tenantAppService';

// Main app ID (used for authentication and profile retrieval)
const MAIN_APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!MAIN_APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is not set in environment variables');
}

// Store the current db instance
let currentDbInstance: any = null;

/**
 * Initialize db with main app ID (for authentication and profile operations)
 */
export const initializeMainDb = () => {
  if (!currentDbInstance || currentDbInstance._appId !== MAIN_APP_ID) {
    currentDbInstance = init({
      appId: MAIN_APP_ID,
    });
    console.log('Initialized main app db connection');
  }
  return currentDbInstance;
};

/**
 * Initialize db with tenant app ID (for user data operations)
 */
export const initializeTenantDb = async (tenantAppId?: string) => {
  let appId = tenantAppId;

  // If no tenant app ID is provided, try to get it from secure storage
  if (!appId) {
    appId = await getTenantAppId();
  }

  if (!appId) {
    throw new Error('No tenant app ID available. User may need to complete onboarding or sign in again.');
  }

  // Initialize db with tenant app ID
  const tenantDb = init({
    appId: appId,
  });
  
  console.log('Initialized tenant app db connection with ID:', appId);
  return tenantDb;
};

/**
 * Function to switch the main db instance to use tenant app
 * This should be called after authentication when we have the tenant app ID
 * The tenantAppId must be provided or already stored in secure storage
 */
export const switchToTenantDb = async (tenantAppId?: string) => {
  let appId = tenantAppId;

  // If no tenant app ID is provided, try to get it from secure storage
  if (!appId) {
    appId = await getTenantAppId();
  }

  if (!appId) {
    throw new Error('No tenant app ID available. User may need to complete onboarding or sign in again.');
  }

  // Initialize db with tenant app ID
  const tenantDbInstance = init({
    appId: appId,
  });
  
  // Debug: check if the instance has the required methods
  console.log('New tenant DB has subscribeQuery:', typeof tenantDbInstance.subscribeQuery === 'function');
  console.log('New tenant DB methods:', Object.keys(tenantDbInstance || {}).filter(key => typeof tenantDbInstance[key] === 'function').slice(0, 10));
  
  // Switch to tenant app db
  currentDbInstance = tenantDbInstance;
  console.log('Switched to tenant app db connection:', appId);
  return currentDbInstance;
};

/**
 * Get the current db instance (main or tenant)
 */
export const getCurrentDb = () => {
  if (!currentDbInstance) {
    return initializeMainDb();
  }
  return currentDbInstance;
};

/**
 * Function to check if we're currently using tenant db
 */
export const isUsingTenantDb = () => {
  if (!currentDbInstance) return false;
  return currentDbInstance._appId !== MAIN_APP_ID;
};