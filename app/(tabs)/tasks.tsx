import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TasksScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with profile circle */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.profileCircle} 
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.profileText}>P</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>Your tasks will appear here</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    marginTop: 50,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});