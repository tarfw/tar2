import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import R2Files from "../../components/r2files";

const agentsData = [
  { id: "1", name: "Items", icon: "📦" },
  { id: "2", name: "Products", icon: "🛍️" },
  { id: "3", name: "Orders", icon: "🎈" },
  { id: "4", name: "Files", icon: "📁" },
];

export default function AgentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedAgent, setSelectedAgent] = useState(agentsData[0]); // Default to first agent

  // Update selected agent when params change
  useEffect(() => {
    if (params.selectedAgentId) {
      const agent = agentsData.find((a) => a.id === params.selectedAgentId);
      if (agent) {
        setSelectedAgent(agent);
      }
    }
  }, [params]);

  const handleAgentSelect = (agent: { id: string; name: string; icon: string }) => {
    if (agent.name === "Products") {
      // Navigate to products screen
      router.push("/(tabs)/products");
    } else if (agent.name === "Files") {
      // Files agent stays in this screen
      setSelectedAgent(agent);
    } else {
      // For other agents, update selection but stay in this screen
      setSelectedAgent(agent);
    }
  };

  const renderAgentContent = () => {
    if (selectedAgent.name === "Files") {
      // For Files agent, show file management interface
      return (
        <View style={styles.filesContainer}>
          <R2Files />
        </View>
      );
    } else {
      // For other non-Products agents, show generic content
      return (
        <View style={styles.content}>
          <View style={styles.agentHeader}>
            <Text style={styles.agentIconLarge}>{selectedAgent.icon}</Text>
            <Text style={styles.agentTitle}>{selectedAgent.name}</Text>
          </View>
          <Text style={styles.placeholderText}>
            {selectedAgent.name} data will be displayed here
          </Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with selected agent */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.agentsCard}
          onPress={() => {
            if (selectedAgent.name === "Products") {
              router.push("/(tabs)/products");
            } else if (selectedAgent.name === "Files") {
              // Files component is already rendered here, so no navigation needed
            } else {
              // For other agents, go to agents-list to select another
              router.push("/(tabs)/agents-list");
            }
          }}
        >
          <Text style={styles.agentsText}>
            {selectedAgent.icon} {selectedAgent.name}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main content area showing selected agent data */}
      {renderAgentContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  agentsCard: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  agentsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 20,
  },
  agentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  agentIconLarge: {
    fontSize: 32,
    marginRight: 16,
  },
  agentTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  filesContainer: {
    flex: 1,
  },
});
