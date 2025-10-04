import { init } from '@instantdb/react-native';

// Load InstantDB main app ID from environment variables
const MAIN_APP_ID = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!MAIN_APP_ID) {
  throw new Error('EXPO_PUBLIC_INSTANT_APP_ID is not set in environment variables');
}

export const mainDb = init({
  appId: MAIN_APP_ID,
});