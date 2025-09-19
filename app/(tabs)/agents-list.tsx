import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/db';
import { SafeAreaView } from 'react-native-safe-area-context';

const agentsData = [
  { id: '1', name: 'Items', icon: '📦' },
  { id: '2', name: 'Products', icon: '🛍️' },
  { id: '3', name: 'Orders', icon: '📋' },
];

export default function AgentsList() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = db.useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert('Error', error.body?.message || error.message || 'Failed to sign out');
    }
  };

  const renderAgentItem = ({ item }: { item: { id: string; name: string; icon: string } }) => (
    <TouchableOpacity style={styles.agentItem}>
      <Text style={styles.agentIcon}>{item.icon}</Text>
      <Text style={styles.agentName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agents</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={agentsData}
        renderItem={renderAgentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
      
      {/* Sign out button at the bottom as hand emoji */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutEmoji}>👋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  listContainer: {
    padding: 0,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  agentIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  agentName: {
    fontSize: 18,
    color: '#333',
  },
  signOutButton: {
    alignSelf: 'center',
    marginVertical: 30,
  },
  signOutEmoji: {
    fontSize: 40,
  },
});