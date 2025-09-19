import { Stack } from "expo-router";
import { db } from "../lib/db";
import { AuthProvider } from "../lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider db={db}>
      <db.SignedIn>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </db.SignedIn>
      <db.SignedOut>
        <Stack>
          <Stack.Screen name="auth/magic-auth" options={{ headerShown: false }} />
          <Stack.Screen name="index" redirect={true} options={{ headerShown: false }} />
        </Stack>
      </db.SignedOut>
    </AuthProvider>
  );
}