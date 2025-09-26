import { db } from './db';
import { storeTenantAppId } from './secureStorage';

/**
 * Retrieve the tenant app ID from the user's profile in the main app
 * and store it securely for future use
 */
export const retrieveAndStoreTenantAppId = async (userId: string): Promise<string | null> => {
  try {
    console.log('Retrieving tenant app ID for user:', userId);
    
    // Query the profile in the main app where profiles are stored
    const res = await db.queryOnce({
      profile: {
        $: {
          where: {
            '$users.id': userId
          }
        }
      }
    });
    
    const profile = res.data.profile[0] || null;
    
    if (profile && profile.instantapp) {
      // Store the tenant app ID securely
      await storeTenantAppId(profile.instantapp);
      console.log('Tenant app ID retrieved and stored securely:', profile.instantapp);
      return profile.instantapp;
    } else {
      console.log('No tenant app ID found in profile for user:', userId);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving tenant app ID from profile:', error);
    throw error;
  }
};

/**
 * Get the tenant app ID directly from the user's profile in the main app
 * without storing it (useful for checking if a user has a tenant app)
 */
export const getTenantAppIdFromProfile = async (userId: string): Promise<string | null> => {
  try {
    console.log('Getting tenant app ID from profile for user:', userId);
    
    // Query the profile in the main app where profiles are stored
    const res = await db.queryOnce({
      profile: {
        $: {
          where: {
            '$users.id': userId
          }
        }
      }
    });
    
    const profile = res.data.profile[0] || null;
    
    if (profile && profile.instantapp) {
      console.log('Tenant app ID retrieved from profile:', profile.instantapp);
      return profile.instantapp;
    } else {
      console.log('No tenant app ID found in profile for user:', userId);
      return null;
    }
  } catch (error) {
    console.error('Error getting tenant app ID from profile:', error);
    throw error;
  }
};