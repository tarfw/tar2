import { db } from './db';
import { id, tx } from '@instantdb/react-native';

export interface Profile {
  id?: string;
  email: string;
  username?: string;
  name?: string;
  createdAt?: string;
  lastLoginAt?: string;
  userId?: string;
  instantapp?: string; // Added field to store Instant app ID
}

/**
 * Fetch profile by user ID (linked to $users)
 */
export async function fetchProfileByUserId(userId: string) {
  try {
    console.log('Fetching profile for user ID:', userId);
    const res = await db.queryOnce({
      profile: {
        $: {
          where: {
            '$users.id': userId
          }
        }
      }
    });
    
    console.log('Profile query result:', res.data);
    const profile = res.data.profile[0] || null;
    console.log('Returning profile:', profile);
    return profile;
  } catch (error) {
    console.error('Error fetching profile by user ID:', error);
    return null;
  }
}

/**
 * Create a new profile for the user
 */
export async function createProfile(email: string, userId: string, username: string, instantAppId?: string | null) {
  try {
    const profileId = id();
    const newProfile = {
      id: profileId,
      email,
      username,
      name: '',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      instantapp: instantAppId || undefined, // Store the Instant app ID if provided, otherwise undefined
    };
    
    console.log('Creating profile:', newProfile);
    console.log('Linking to user ID:', userId);
    
    await db.transact([
      tx.profile[profileId].update(newProfile),
      tx.profile[profileId].link({ $users: userId })
    ]);
    
    console.log('Profile created successfully');
    
    // Verify the profile was created
    const verifyResult = await db.queryOnce({
      profile: {
        $: {
          where: {
            id: profileId
          }
        }
      }
    });
    
    console.log('Verified profile creation:', verifyResult.data.profile[0]);
    
    return { ...newProfile, $users: { id: userId } };
  } catch (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
}