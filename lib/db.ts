import { init } from '@instantdb/react-native';
import Constants from 'expo-constants';

// Using your provided InstantDB app ID
const APP_ID = '9e8cde29-5ce0-4a73-91c3-0019a469001e';

export const db = init({
  appId: APP_ID,
  // Optional: Add secure store configuration for storing auth tokens
  // This will automatically persist the user's session
  secureStore: {
    // This will use Expo's SecureStore to persist the session
    key: 'instantdb-auth-token',
  }
});