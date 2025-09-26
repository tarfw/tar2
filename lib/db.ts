import { init } from '@instantdb/react-native';

// Load InstantDB app ID from environment variables
const APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is not set in environment variables');
}

export const db = init({
  appId: APP_ID,
  // Session persistence is handled automatically by InstantDB
});