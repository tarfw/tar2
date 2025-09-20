import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgentsScreen() {
  const router = useRouter();

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
});