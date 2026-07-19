import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { useAuth } from '../../hooks/useAuth';
import { useAthletes } from '../../hooks/useAthletes';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useTheme } from '../../theme/ThemeProvider';

const PREFERENCES: Array<{ label: string; value: 'system' | 'light' | 'dark' }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function Settings() {
  const { colors, preference, setPreference } = useTheme();
  const { teamMember, signOut } = useAuth();
  const isParent = teamMember?.role === 'parent';
  const { data: athletes, addAthlete } = useAthletes();
  const pushNotifications = usePushNotifications();

  const [athleteName, setAthleteName] = useState('');
  const [athleteError, setAthleteError] = useState<string | null>(null);

  const onAddAthlete = async () => {
    setAthleteError(null);
    try {
      await addAthlete.mutateAsync(athleteName.trim());
      setAthleteName('');
    } catch (e) {
      setAthleteError(e instanceof Error ? e.message : 'Could not add athlete.');
    }
  };

  return (
    <Screen scroll>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={styles.prefRow}>
          {PREFERENCES.map((pref) => (
            <Pressable
              key={pref.value}
              onPress={() => setPreference(pref.value)}
              style={[
                styles.prefChip,
                {
                  borderColor: colors.border,
                  backgroundColor: preference === pref.value ? colors.primary : 'transparent',
                },
              ]}
            >
              <Text style={{ color: preference === pref.value ? '#fff' : colors.text }}>{pref.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Push Notifications</Text>
        <Text style={{ color: colors.textMuted, marginBottom: 10 }}>
          {pushNotifications.status === 'registered'
            ? "You're set up to receive push notifications on this device."
            : 'Enable push notifications to get alerts for new events and payment reminders.'}
        </Text>
        {pushNotifications.status === 'denied' ? (
          <Text style={{ color: colors.danger, marginBottom: 10 }}>
            Notifications permission was denied. Enable it in your device settings.
          </Text>
        ) : null}
        <ErrorText>{pushNotifications.error}</ErrorText>
        <Button
          title={pushNotifications.status === 'registered' ? 'Registered' : 'Enable Push Notifications'}
          onPress={pushNotifications.register}
          loading={pushNotifications.status === 'registering'}
          disabled={pushNotifications.status === 'registered'}
        />
      </Card>

      {isParent ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Athletes</Text>
          {(athletes ?? []).map((a) => (
            <Text key={a.id} style={{ color: colors.text, paddingVertical: 4 }}>
              • {a.name}
            </Text>
          ))}
          <ErrorText>{athleteError}</ErrorText>
          <TextField
            label="Add an athlete"
            value={athleteName}
            onChangeText={setAthleteName}
            placeholder="Daughter's name"
          />
          <Button title="Add" onPress={onAddAthlete} loading={addAthlete.isPending} disabled={!athleteName.trim()} />
        </Card>
      ) : null}

      <Button title="Sign Out" variant="danger" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  prefRow: { flexDirection: 'row', gap: 10 },
  prefChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
});
