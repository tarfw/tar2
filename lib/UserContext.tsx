import React, { createContext, useContext, useState } from 'react';

interface UserContextType {
  userProfile: any | null;
  loading: boolean;
  refreshProfile: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile] = useState<any | null>(null);
  const [loading] = useState(false);

  const refreshProfile = () => {
    // No-op since we're not using auth/profile
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