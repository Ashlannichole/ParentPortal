import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme/ThemeProvider';

export default function Welcome() {
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.spacer} />
      <Text style={[styles.title, { color: colors.text }]}>Team Parent Portal</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Payments, schedules, coach info, and team SWAG voting — all in one place.
      </Text>
      <View style={styles.spacer} />
      <View style={styles.actions}>
        <Button title="Log In" onPress={() => router.push('/(auth)/sign-in')} />
        <View style={styles.gap} />
        <Button
          title="Join an Existing Team"
          variant="secondary"
          onPress={() => router.push('/(auth)/join-team')}
        />
        <View style={styles.gap} />
        <Button
          title="Start a New Team (Coach)"
          variant="secondary"
          onPress={() => router.push('/(auth)/create-team')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1 },
  title: { fontSize: 30, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  actions: { marginBottom: 12 },
  gap: { height: 12 },
});
