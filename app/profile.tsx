import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { updateUserProfile } from '../lib/userProfile';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import Toast from 'react-native-toast-message';

export default function UserProfileScreen() {
  const router = useRouter();
  const { userProfile, signOut, loadingProfile, requiresUsernameSetup, refreshUserProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [tursoAuthToken, setTursoAuthToken] = useState(userProfile?.tursoCredentials?.authToken || '');
  const [tursoHostname, setTursoHostname] = useState(userProfile?.tursoCredentials?.hostname || '');
  const [tursoDbName, setTursoDbName] = useState(userProfile?.tursoCredentials?.dbName || '');
  const [loading, setLoading] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameHasBeenSet, setUsernameHasBeenSet] = useState(!!userProfile?.username);

  // Prevent back navigation if username is required but not set
  useEffect(() => {
    if (requiresUsernameSetup && !usernameHasBeenSet) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevent back navigation
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [requiresUsernameSetup, usernameHasBeenSet]);

  // Update the state with the loaded profile data when it changes
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setUsername(userProfile.username || '');
      setTursoAuthToken(userProfile.tursoCredentials?.authToken || '');
      setTursoHostname(userProfile.tursoCredentials?.hostname || '');
      setTursoDbName(userProfile.tursoCredentials?.dbName || '');
      setUsernameHasBeenSet(!!userProfile.username);
    }
  }, [userProfile]);

  const handleSaveUsername = async () => {
    if (!userProfile) return;
    
    setUsernameSaving(true);
    try {
      console.log('Saving username:', username, 'for profile ID:', userProfile.id);
      await updateUserProfile(userProfile.id!, {
        username
      });
      
      // Mark that username has been set
      setUsernameHasBeenSet(true);
      
      // Refresh the user profile in the auth context
      await refreshUserProfile();
      
      // If this was the initial setup, redirect to main app
      if (requiresUsernameSetup) {
        router.replace('/(tabs)');
      } else {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Username updated successfully'
        });
      }
    } catch (error: any) {
      console.error('Error updating username:', error);
      // Provide specific feedback for username uniqueness errors
      let errorMessage = error.message || 'Failed to update username';
      if (errorMessage.includes('record-not-unique') || errorMessage.includes('already exists')) {
        errorMessage = 'This username is already taken. Please choose a different username.';
      }
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage
      });
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile) return;
    
    setLoading(true);
    try {
      console.log('Saving profile:', {
        id: userProfile.id,
        name,
        username,
        tursoCredentials: {
          authToken: tursoAuthToken,
          hostname: tursoHostname,
          dbName: tursoDbName
        }
      });
      await updateUserProfile(userProfile.id!, {
        name,
        username,
        tursoCredentials: {
          authToken: tursoAuthToken,
          hostname: tursoHostname,
          dbName: tursoDbName
        }
      });
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/magic-auth');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No profile found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {requiresUsernameSetup ? "Set Your Username" : userProfile?.email}
        </Text>
        {userProfile?.lastLoginAt && !requiresUsernameSetup && (
          <Text style={styles.lastLoginText}>
            Last login: {new Date(userProfile.lastLoginAt).toLocaleString()}
          </Text>
        )}
        {requiresUsernameSetup && (
          <Text style={styles.lastLoginText}>
            Please set your username to continue
          </Text>
        )}
      </View>
      
      <View style={styles.form}>
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputWithButton}>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            editable={!usernameHasBeenSet}
          />
          {!usernameHasBeenSet ? (
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveUsername}
              disabled={usernameSaving || !username}
            >
              {usernameSaving ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={20} color="#888" />
            </View>
          )}
        </View>
        
        {usernameHasBeenSet && (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
            
            <Text style={styles.sectionTitle}>Turso Database Credentials</Text>
            
            <Text style={styles.label}>Auth Token</Text>
            <TextInput
              style={styles.input}
              value={tursoAuthToken}
              onChangeText={setTursoAuthToken}
              placeholder="Enter your Turso auth token"
              secureTextEntry
            />
            
            <Text style={styles.label}>Hostname</Text>
            <TextInput
              style={styles.input}
              value={tursoHostname}
              onChangeText={setTursoHostname}
              placeholder="Enter your Turso hostname"
            />
            
            <Text style={styles.label}>Database Name</Text>
            <TextInput
              style={styles.input}
              value={tursoDbName}
              onChangeText={setTursoDbName}
              placeholder="Enter your database name"
            />
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity 
          style={[styles.secondaryButton]} 
          onPress={handleSignOut}
        >
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
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
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  lastLoginText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#007AFF',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    flex: 1,
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
  },
  saveButton: {
    padding: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedBadge: {
    padding: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#ff3b30',
    borderWidth: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  secondaryButtonText: {
    color: '#ff3b30',
    fontSize: 18,
    fontWeight: 'bold',
  },
});