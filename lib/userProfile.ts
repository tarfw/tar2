import { db } from './db';
import { id, tx } from '@instantdb/react-native';

export interface UserProfile {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  username?: string;
  createdAt: string;
  lastLoginAt?: string;
  tursoCredentials?: {
    authToken?: string;
    hostname?: string;
    dbName?: string;
  };
}

/**
 * Check if a user profile exists for the given email
 */
export async function getUserProfileByEmail(email: string) {
  const authResult = await db.getAuth();
  console.log('getUserProfileByEmail - Auth result:', authResult);
  console.log('getUserProfileByEmail - Requested email:', email);
  
  if (!authResult || authResult.email !== email) {
    // If the authenticated user's email doesn't match the requested email, return null
    console.log('getUserProfileByEmail - Email mismatch, returning null');
    return null;
  }
  
  const res = await db.queryOnce({
    profile: {
      $: {
        where: {
          email: email
        }
      }
    }
  });
  
  console.log('getUserProfileByEmail - Query result:', res.data.profile[0]);
  return res.data.profile[0] || null;
}

/**
 * Create a new user profile
 */
export async function createUserProfile(profile: Omit<UserProfile, 'id'>) {
  const profileId = id();
  console.log('createUserProfile - Creating profile with ID:', profileId, 'and data:', profile);
  await db.transact(
    tx.profile[profileId].update({
      ...profile,
      id: profileId
    })
  );
  return { id: profileId, ...profile };
}

/**
 * Update an existing user profile
 */
export async function updateUserProfile(id: string, updates: Partial<UserProfile>) {
  console.log('updateUserProfile - Updating profile with ID:', id, 'and updates:', updates);
  await db.transact(
    tx.profile[id].update(updates)
  );
  return { id, ...updates };
}

/**
 * Initialize a new user profile
 */
export async function initializeNewUser(email: string, name?: string) {
  const authResult = await db.getAuth();
  console.log('initializeNewUser - Auth result:', authResult);
  console.log('initializeNewUser - Email:', email);
  
  const newProfile: Omit<UserProfile, 'id'> = {
    email,
    userId: authResult?.id || undefined,
    name: name || '',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  
  console.log('initializeNewUser - Creating profile:', newProfile);
  return await createUserProfile(newProfile);
}

/**
 * Update last login timestamp for returning user
 */
export async function updateLastLogin(userId: string) {
  return await updateUserProfile(userId, {
    lastLoginAt: new Date().toISOString()
  });
}