import { Tabs } from "expo-router";
import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../../lib/db";
import { useEffect, useState } from "react";

export default function TabLayout() {
  const { isLoading, user } = db.useAuth();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Just wait for initial auth check
  useEffect(() => {
    if (!isLoading) {
      setInitialLoad(false);
    }
  }, [isLoading]);
  
  // If still loading, show nothing
  if (isLoading || initialLoad) {
    return null;
  }
  
  // If no user, this shouldn't happen since we would have been redirected already
  // But just in case, we'll redirect to auth
  if (!user) {
    return null; // Let the root layout handle this
  }
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="radio-button-unchecked" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Agents",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="check-box-outline-blank" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="alternate-email" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agents-list"
        options={{
          href: null, // Hide this from the tab bar
        }}
      />
    </Tabs>
  );
}