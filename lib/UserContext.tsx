import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from './db';
import { fetchProfileByUserId } from './profile';

interface UserProfile {
  id?: string;
  email: string;
  username?: string;
  name?: string;
  createdAt?: string;
  lastLoginAt?: string;
  userId?: string;
}

interface UserContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = db.useAuth();

  const fetchUserProfile = async () => {
    if (user?.id) {
      try {
        setLoading(true);
        const profile = await fetchProfileByUserId(user.id);
        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user?.id]);

  const refreshProfile = async () => {
    await fetchUserProfile();
  };

  return (
    <UserContext.Provider value={{ userProfile, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};