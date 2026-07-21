import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';
import { useTheme } from '../theme/ThemeProvider';

export default function Index() {
  const { session, teamMember, loading } = useAuth();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();
  const { colors } = useTheme();

  if (loading || (teamMember && onboardingLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!teamMember) return <Redirect href="/(auth)/join-team" />;
  if (needsOnboarding) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(app)" />;
}
