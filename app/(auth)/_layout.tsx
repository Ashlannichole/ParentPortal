import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';

export default function AuthLayout() {
  const { session, teamMember, loading } = useAuth();
  const { colors } = useTheme();

  if (!loading && session && teamMember) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" options={{ headerShown: true, title: 'Log In' }} />
      <Stack.Screen name="create-team" options={{ headerShown: true, title: 'Create a Team' }} />
      <Stack.Screen name="join-team" options={{ headerShown: true, title: 'Join a Team' }} />
    </Stack>
  );
}
