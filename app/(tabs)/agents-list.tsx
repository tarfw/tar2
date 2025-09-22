import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const agentsData = [
  { id: '1', name: 'Items', icon: '📦' },
  { id: '2', name: 'Products', icon: '🛍️' },
  { id: '3', name: 'Orders', icon: '🎈' },
  { id: '4', name: 'Files', icon: '📁' },
];

export default function AgentsListScreen() {
  const router = useRouter();

  const handleAgentSelect = (agent: { id: string; name: string; icon: string }) => {
    // Pass the selected agent back to the main screen for all agents
    router.push({
      pathname: '/(tabs)/',
      params: { 
        selectedAgentId: agent.id,
        selectedAgentName: agent.name,
        selectedAgentIcon: agent.icon
      }
    });
  };

  const renderAgentItem = ({ item }: { item: { id: string; name: string; icon: string } }) => (
    <TouchableOpacity 
      style={styles.agentItem} 
      onPress={() => handleAgentSelect(item)}
    >
      <Text style={styles.agentIcon}>{item.icon}</Text>
      <Text style={styles.agentName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Agent</Text>
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
});