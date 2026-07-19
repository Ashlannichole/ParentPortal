import React, { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorText } from '../../components/ErrorText';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';

export default function CreateTeam() {
  const { colors } = useTheme();
  const { refreshTeamMember } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setConfirmMessage(null);
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (!signUpData.session) {
      setLoading(false);
      setConfirmMessage(
        'Check your email to confirm your account, then log in to finish creating your team.'
      );
      return;
    }

    const { error: rpcError } = await supabase.rpc('create_team', {
      p_name: teamName.trim(),
      p_full_name: fullName.trim() || null,
    });
    if (rpcError) {
      setLoading(false);
      setError(rpcError.message);
      return;
    }
    await refreshTeamMember();
    setLoading(false);
    router.replace('/');
  };

  return (
    <Screen>
      <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
        This makes you the first coach on this team. You'll get a coach code and a parent code
        to share once your team is created.
      </Text>
      <ErrorText>{error}</ErrorText>
      {confirmMessage ? (
        <Text style={{ color: colors.success, marginBottom: 14 }}>{confirmMessage}</Text>
      ) : null}
      <TextField label="Team Name" placeholder="e.g. Viking VB 16U" value={teamName} onChangeText={setTeamName} />
      <TextField label="Your Name" placeholder="Coach Jane Smith" value={fullName} onChangeText={setFullName} />
      <TextField
        label="Your Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button
        title="Create Team"
        onPress={onSubmit}
        loading={loading}
        disabled={!teamName || !email || !password}
      />
    </Screen>
  );
}
