import { db } from './db';
import { id, tx } from '@instantdb/react-native';

export interface UserProfile {
  id?: string;
  email: string;
  name?: string;
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
  const res = await db.queryOnce({
    profile: {
      $: {
        where: {
          email: email
        }
      }
    }
  });
  
  return res.data.profile[0] || null;
}

/**
 * Create a new user profile
 */
export async function createUserProfile(profile: Omit<UserProfile, 'id'>) {
  const profileId = id();
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
  await db.transact(
    tx.profile[id].update(updates)
  );
  return { id, ...updates };
}

/**
 * Initialize a new user profile
 */
export async function initializeNewUser(email: string, name?: string) {
  const newProfile: Omit<UserProfile, 'id'> = {
    email,
    name: name || '',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  
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