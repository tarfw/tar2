import { Stack } from "expo-router";
import { db } from "../lib/db";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { fetchProfileByUserId } from '../lib/profile';
import Toast from 'react-native-toast-message';

export default function RootLayout() {
  const { isLoading, user } = db.useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Check profile status when user auth state changes
  useEffect(() => {
    const checkProfile = async () => {
      if (user?.id) {
        try {
          // Check if user has a profile
          const profile = await fetchProfileByUserId(user.id);
          setHasProfile(!!profile);
        } catch (error) {
          console.error('Error checking profile:', error);
          setHasProfile(null);
        }
      } else {
        setHasProfile(null);
      }
      
      if (initialLoad) {
        setInitialLoad(false);
      }
    };

    checkProfile();
  }, [user]);

  // If we're still checking auth status, show nothing
  if (isLoading || initialLoad) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {user ? (
        <Stack 
          screenOptions={{
            headerShown: false,
            header: () => null
          }}
        >
          {hasProfile === false ? (
            // User authenticated but no profile - show onboarding
            <Stack.Screen 
              name="onboard" 
              options={{ 
                headerShown: false,
                header: () => null,
                title: "Set Username"
              }} 
            />
          ) : (
            // User authenticated with profile - show main app
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false,
                header: () => null,
                title: "Home"
              }} 
            />
          )}
          <Stack.Screen 
            name="profile" 
            options={{ 
              headerShown: false,
              header: () => null
            }} 
          />
        </Stack>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            header: () => null
          }}
        >
          <Stack.Screen 
            name="auth/magic-auth" 
            options={{ 
              headerShown: false,
              header: () => null,
              title: "Sign In"
            }} 
          />
          <Stack.Screen 
            name="index" 
            redirect={true} 
            options={{ 
              headerShown: false,
              header: () => null
            }} 
          />
        </Stack>
      )}
      <Toast />
    </SafeAreaProvider>
  );
}