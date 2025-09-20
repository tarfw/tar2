import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { updateUserProfile } from '../lib/userProfile';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProfileScreen() {
  const router = useRouter();
  const { userProfile, signOut, loadingProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name || '');
  const [tursoAuthToken, setTursoAuthToken] = useState(userProfile?.tursoCredentials?.authToken || '');
  const [tursoHostname, setTursoHostname] = useState(userProfile?.tursoCredentials?.hostname || '');
  const [tursoDbName, setTursoDbName] = useState(userProfile?.tursoCredentials?.dbName || '');
  const [loading, setLoading] = useState(false);

  // Update the state with the loaded profile data when it changes
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setTursoAuthToken(userProfile.tursoCredentials?.authToken || '');
      setTursoHostname(userProfile.tursoCredentials?.hostname || '');
      setTursoDbName(userProfile.tursoCredentials?.dbName || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!userProfile) return;
    
    setLoading(true);
    try {
      await updateUserProfile(userProfile.id!, {
        name,
        tursoCredentials: {
          authToken: tursoAuthToken,
          hostname: tursoHostname,
          dbName: tursoDbName
        }
      });
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
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
        <Text style={styles.title}>User Profile</Text>
        <Text style={styles.email}>{userProfile.email}</Text>
        {userProfile.lastLoginAt && (
          <Text style={styles.lastLoginText}>
            Last login: {new Date(userProfile.lastLoginAt).toLocaleString()}
          </Text>
        )}
      </View>
      
      <View style={styles.form}>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
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