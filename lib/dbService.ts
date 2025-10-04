import { init } from '@instantdb/react-native';

// Main app ID (used for authentication and data operations)
const MAIN_APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!MAIN_APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is not set in environment variables');
}

// Store the current db instance
let currentDbInstance: any = null;

/**
 * Initialize db with main app ID (for authentication and data operations)
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
 * Get the current db instance
 */
export const getCurrentDb = () => {
  if (!currentDbInstance) {
    return initializeMainDb();
  }
  return currentDbInstance;
};