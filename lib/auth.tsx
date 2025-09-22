import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { InstantReactNativeDatabase } from '@instantdb/react-native';
import { 
  getUserProfileByEmail, 
  initializeNewUser, 
  updateLastLogin,
  updateUserProfile,
  UserProfile 
} from './userProfile';

interface AuthContextType {
  sendMagicCode: (email: string) => Promise<void>;
  signInWithMagicCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  userProfile: UserProfile | null;
  loadingProfile: boolean;
  loadUserProfile: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  db,
  children 
}: { 
  db: InstantReactNativeDatabase<any>;
  children: ReactNode;
}) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Load the user profile when the user is authenticated
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Get the current authenticated user
        const authResult = await db.getAuth();
        console.log('Auth result:', authResult);
        if (authResult && authResult.email) {
          console.log('Authenticated user email:', authResult.email);
          // Set loadingProfile to true while we load the user profile
          setLoadingProfile(true);
          
          // Check if user profile exists
          const profile = await getUserProfileByEmail(authResult.email);
          console.log('Profile found:', profile);
          
          if (profile) {
            // Returning user - check if profile has userId
            if (!profile.userId) {
              console.log('Profile missing userId, updating...');
              // Update profile to include userId
              await updateUserProfile(profile.id!, {
                userId: authResult.id
              });
              // Reload the profile
              const updatedProfile = await getUserProfileByEmail(authResult.email);
              setUserProfile(updatedProfile as UserProfile);
            } else {
              // Profile already has userId
              console.log('Profile has userId:', profile.userId);
              setUserProfile(profile as UserProfile);
            }
          } else {
            // New user - create profile
            console.log('No profile found, creating new profile for:', authResult.email);
            const newProfile = await initializeNewUser(authResult.email);
            console.log('New profile created:', newProfile);
            setUserProfile(newProfile);
          }
          
          // Set loadingProfile to false after we've loaded the profile
          setLoadingProfile(false);
        } else {
          // No authenticated user, reset the profile
          console.log('No authenticated user');
          setUserProfile(null);
          setLoadingProfile(false);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
        setLoadingProfile(false);
      }
    };
    
    loadProfile();
  }, [db]);

  const sendMagicCode = async (email: string) => {
    try {
      // Try to send the magic code
      await db.auth.sendMagicCode({ email });
    } catch (error: any) {
      console.error('Error sending magic code:', error);
      // If we get a specific error about the user not existing, we might need to handle it differently
      // But for now, let's just re-throw the error
      throw new Error(error.body?.message || error.message || 'Failed to send magic code');
    }
  };

  const signInWithMagicCode = async (email: string, code: string) => {
    try {
      // First, try to sign in with the magic code
      const result = await db.auth.signInWithMagicCode({ email, code });
      console.log('Sign in result:', result);
      
      // The profile will be loaded by the useEffect hook above
      // We don't need to do anything here
    } catch (error: any) {
      console.error('Error signing in with magic code:', error);
      
      // Check if this is the specific error we're seeing
      if (error.message && error.message.includes('Record not found: app-user-magic-code')) {
        // This might be a first-time user issue
        // Let's try a different approach - create the user first
        // But InstantDB should handle this automatically
        // Let's just re-throw the error with a more user-friendly message
        throw new Error('Invalid magic code or the code has expired. Please request a new code.');
      }
      
      // Handle other errors
      throw new Error(error.body?.message || error.message || 'Failed to sign in with magic code');
    }
  };

  const signOut = async () => {
    try {
      await db.auth.signOut();
      setUserProfile(null);
    } catch (error: any) {
      // Handle error appropriately
      throw new Error(error.body?.message || error.message || 'Failed to sign out');
    }
  };

  // We'll rely on components to call loadUserProfile when needed
  const loadUserProfile = async (email: string) => {
    setLoadingProfile(true);
    try {
      const profile = await getUserProfileByEmail(email);
      if (profile) {
        setUserProfile(profile as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        sendMagicCode,
        signInWithMagicCode,
        signOut,
        userProfile,
        loadingProfile,
        loadUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}