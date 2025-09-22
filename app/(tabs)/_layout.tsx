import { Tabs } from "expo-router";
import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { Redirect } from "expo-router";

export default function TabLayout() {
  const { userProfile, requiresUsernameSetup } = useAuth();
  
  // If user needs to set up username, redirect to profile screen
  if (userProfile && requiresUsernameSetup) {
    return <Redirect href="/profile" />;
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