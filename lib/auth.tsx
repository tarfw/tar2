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
  requiresUsernameSetup: boolean;
  checkIfUserHasProfile: (email: string) => Promise<boolean>;
  checkIfUserHasUsername: (email: string) => Promise<boolean>;
  refreshUserProfile: () => Promise<void>;
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
  const [requiresUsernameSetup, setRequiresUsernameSetup] = useState<boolean>(false);
  const [userHasProfile, setUserHasProfile] = useState<boolean | null>(null);
  const [userHasUsername, setUserHasUsername] = useState<boolean | null>(null);

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
              
              // Check if username is required
              setRequiresUsernameSetup(!updatedProfile?.username);
            } else {
              // Profile already has userId
              console.log('Profile has userId:', profile.userId);
              setUserProfile(profile as UserProfile);
              
              // Check if username is required
              setRequiresUsernameSetup(!profile.username);
            }
          } else {
            // New user - create profile
            console.log('No profile found, creating new profile for:', authResult.email);
            const newProfile = await initializeNewUser(authResult.email);
            console.log('New profile created:', newProfile);
            setUserProfile(newProfile);
            
            // New users always need to set up their username
            setRequiresUsernameSetup(true);
          }
          
          // Set loadingProfile to false after we've loaded the profile
          setLoadingProfile(false);
        } else {
          // No authenticated user, reset the profile
          console.log('No authenticated user');
          setUserProfile(null);
          setLoadingProfile(false);
          setRequiresUsernameSetup(false);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
        setLoadingProfile(false);
        setRequiresUsernameSetup(false);
      }
    };
    
    loadProfile();
  }, [db]);

  const sendMagicCode = async (email: string) => {
    try {
      // Try to send the magic code
      await db.auth.sendMagicCode({ email });
      
      // Check if user has profile and username for optimization
      const hasProfile = await checkIfUserHasProfile(email);
      const hasUsername = await checkIfUserHasUsername(email);
      
      setUserHasProfile(hasProfile);
      setUserHasUsername(hasUsername);
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
      
      // Handle all errors with a generic message
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

  // Check if a user profile exists for the given email
  const checkIfUserHasProfile = async (email: string) => {
    try {
      const profile = await getUserProfileByEmail(email);
      return !!profile;
    } catch (error) {
      console.error('Error checking if user has profile:', error);
      return false;
    }
  };

  // Check if a user has a username set in their profile
  const checkIfUserHasUsername = async (email: string) => {
    try {
      const profile = await getUserProfileByEmail(email);
      return !!profile?.username;
    } catch (error) {
      console.error('Error checking if user has username:', error);
      return false;
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

  // Refresh the user profile
  const refreshUserProfile = async () => {
    try {
      const authResult = await db.getAuth();
      if (authResult && authResult.email) {
        const profile = await getUserProfileByEmail(authResult.email);
        if (profile) {
          setUserProfile(profile as UserProfile);
          setRequiresUsernameSetup(!profile.username);
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
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
        loadUserProfile,
        requiresUsernameSetup,
        checkIfUserHasProfile,
        checkIfUserHasUsername,
        refreshUserProfile
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