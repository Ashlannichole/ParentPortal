import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Redirect, Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';

export default function AppLayout() {
  const { session, teamMember, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!teamMember) return <Redirect href="/(auth)/join-team" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconInactive,
        headerRight: () => (
          <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={{ marginRight: 16 }}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="team-info"
        options={{
          title: 'Team Info',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="swag" options={{ href: null, title: 'SWAG' }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
    </Tabs>
  );
}
