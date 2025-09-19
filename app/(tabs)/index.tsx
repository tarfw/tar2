import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../lib/db';
import { useAuth } from '../../lib/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgentsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = db.useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigate to the auth screen after sign out
      router.replace('/auth/magic-auth');
    } catch (error: any) {
      Alert.alert('Error', error.body?.message || error.message || 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with agents card */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.agentsCard} 
          onPress={() => router.push('/(tabs)/agents-list')}
        >
          <Text style={styles.agentsText}>agents</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to your app!</Text>
        <Text style={styles.subtitle}>You are successfully logged in.</Text>
        {user && <Text style={styles.userText}>User Email: {user.email}</Text>}
        
        {/* Sign out button at the bottom as hand emoji */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutEmoji}>👋</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  agentsCard: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  agentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  userText: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#888',
  },
  signOutButton: {
    alignSelf: 'center',
    marginTop: 50,
  },
  signOutEmoji: {
    fontSize: 40,
  },
});