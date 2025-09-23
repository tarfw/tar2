import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../lib/db';
import { createProfile, fetchProfileByUserId } from '../lib/profile';
import { createInstantApp } from '../lib/instantAppCreation';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = db.useAuth();

  const handleSetUsername = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    console.log('Creating profile for user:', user);
    
    setLoading(true);
    try {
      // Create Instant app for user
      console.log('Creating Instant app for user...');
      const appId = await createInstantApp(username.trim());
      console.log('Instant app created with ID:', appId);
      
      // Create profile with username and store the app ID
      const result = await createProfile(user.email, user.id, username.trim(), appId || undefined);
      console.log('Profile creation result:', result);
      
      // Verify the profile was created by fetching it
      console.log('Verifying profile creation...');
      const verifyProfile = await fetchProfileByUserId(user.id);
      console.log('Verified profile:', verifyProfile);
      
      if (!verifyProfile) {
        throw new Error('Profile verification failed - profile not found after creation');
      }
      
      // Add a small delay to ensure the profile is fully propagated
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // On success, navigate to main app
      console.log('Navigating to tabs screen');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      const errorMessage = error.body?.message || error.message || 'Failed to complete onboarding';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Your Username</Text>
          <Text style={styles.subtitle}>This is how others will see you in the app</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSetUsername}
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleSetUsername}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});