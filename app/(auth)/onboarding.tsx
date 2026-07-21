import React, { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorText } from '../../components/ErrorText';
import { useAuth } from '../../hooks/useAuth';
import { useAthletes } from '../../hooks/useAthletes';
import { useUpdateMyContactInfo } from '../../hooks/useContacts';
import { useTheme } from '../../theme/ThemeProvider';

export default function Onboarding() {
  const { colors } = useTheme();
  const { teamMember, refreshTeamMember } = useAuth();
  const { data: athletes, addAthlete } = useAthletes();
  const updateContactInfo = useUpdateMyContactInfo();

  const [fullName, setFullName] = useState(teamMember?.full_name ?? '');
  const [phone, setPhone] = useState(teamMember?.phone ?? '');
  const [daughterName, setDaughterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsDaughter = (athletes ?? []).length === 0;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await updateContactInfo.mutateAsync({ fullName: fullName.trim(), phone: phone.trim() });
      if (needsDaughter) {
        await addAthlete.mutateAsync(daughterName.trim());
      }
      await refreshTeamMember();
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your info.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = !fullName.trim() || !phone.trim() || (needsDaughter && !daughterName.trim());

  return (
    <Screen scroll>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
        Just a few more details
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
        This helps your coach and other team parents get in touch, and lets us keep track of your
        daughter's payments and lesson sign-ups.
      </Text>
      <ErrorText>{error}</ErrorText>
      <TextField label="Your Full Name" value={fullName} onChangeText={setFullName} />
      <TextField label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {needsDaughter ? (
        <TextField
          label="Daughter's Name"
          value={daughterName}
          onChangeText={setDaughterName}
          placeholder="Her full name"
        />
      ) : null}
      <Button title="Continue" onPress={onSubmit} loading={loading} disabled={disabled} />
    </Screen>
  );
}
