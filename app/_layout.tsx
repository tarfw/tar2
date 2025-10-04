import { Stack } from "expo-router";

import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import Toast from 'react-native-toast-message';
import { UserProvider } from '../lib/UserContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <Stack 
          screenOptions={{
            headerShown: false,
            header: () => null
          }}
        >
          {/* Show main app directly without auth checks */}
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
              header: () => null,
              title: "Home"
            }} 
          />
        </Stack>
        <Toast />
      </UserProvider>
    </SafeAreaProvider>
  );
}