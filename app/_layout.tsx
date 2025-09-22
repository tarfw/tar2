import { Stack } from "expo-router";
import { db } from "../lib/db";
import { AuthProvider, useAuth } from "../lib/auth";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import Toast from 'react-native-toast-message';

function RootLayoutContent() {
  const { userProfile, loadingProfile, requiresUsernameSetup } = useAuth();
  
  // If we're still loading the profile, show nothing
  if (loadingProfile) {
    return null;
  }
  
  // If user needs to set up username, redirect to profile screen
  if (userProfile && requiresUsernameSetup) {
    return (
      <Stack>
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="index" redirect={true} options={{ headerShown: false }} />
      </Stack>
    );
  }
  
  // Regular signed in/out flow
  return (
    <>
      <db.SignedIn>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
        </Stack>
      </db.SignedIn>
      <db.SignedOut>
        <Stack>
          <Stack.Screen 
            name="auth/magic-auth" 
            options={{ 
              headerShown: false,
              title: "Sign In"
            }} 
          />
          <Stack.Screen name="index" redirect={true} options={{ headerShown: false }} />
        </Stack>
      </db.SignedOut>
      <Toast />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider db={db}>
        <RootLayoutContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}