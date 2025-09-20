import { init } from '@instantdb/react-native';
import Constants from 'expo-constants';

// Using your provided InstantDB app ID
const APP_ID = '9e8cde29-5ce0-4a73-91c3-0019a469001e';

export const db = init({
  appId: APP_ID,
  // Session persistence is handled automatically by InstantDB
});