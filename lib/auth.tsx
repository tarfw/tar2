import React, { createContext, useContext, ReactNode } from 'react';
import { InstantDB } from '@instantdb/react-native';

interface AuthContextType {
  sendMagicCode: (email: string) => Promise<void>;
  signInWithMagicCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  db,
  children 
}: { 
  db: InstantDB;
  children: ReactNode;
}) {
  const sendMagicCode = async (email: string) => {
    try {
      await db.auth.sendMagicCode({ email });
    } catch (error: any) {
      // Handle error appropriately
      throw new Error(error.body?.message || error.message || 'Failed to send magic code');
    }
  };

  const signInWithMagicCode = async (email: string, code: string) => {
    try {
      await db.auth.signInWithMagicCode({ email, code });
    } catch (error: any) {
      // Handle error appropriately
      throw new Error(error.body?.message || error.message || 'Failed to sign in with magic code');
    }
  };

  const signOut = async () => {
    try {
      await db.auth.signOut();
    } catch (error: any) {
      // Handle error appropriately
      throw new Error(error.body?.message || error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        sendMagicCode,
        signInWithMagicCode,
        signOut,
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