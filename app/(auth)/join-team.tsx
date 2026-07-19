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

export default function JoinTeam() {
  const { colors } = useTheme();
  const { session, refreshTeamMember } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  // If we already have a session (e.g. the user signed up but has no team
  // yet), we only need the join code -- skip asking for email/password again.
  const needsAccount = !session;

  const joinWithCode = async () => {
    const { error: rpcError } = await supabase.rpc('join_team', {
      p_code: code.trim(),
      p_full_name: fullName.trim() || null,
    });
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    await refreshTeamMember();
    return true;
  };

  const onSubmit = async () => {
    setError(null);
    setConfirmMessage(null);
    setLoading(true);

    if (needsAccount) {
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
          'Check your email to confirm your account, then log in and enter your join code.'
        );
        return;
      }
    }

    const ok = await joinWithCode();
    setLoading(false);
    if (ok) router.replace('/');
  };

  return (
    <Screen>
      <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
        Enter the join code your coach shared with you. Parent codes and coach codes both work
        here -- the app figures out your role automatically.
      </Text>
      <ErrorText>{error}</ErrorText>
      {confirmMessage ? (
        <Text style={{ color: colors.success, marginBottom: 14 }}>{confirmMessage}</Text>
      ) : null}
      {needsAccount ? (
        <>
          <TextField
            label="Your Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        </>
      ) : null}
      <TextField label="Your Name" placeholder="Parent's full name" value={fullName} onChangeText={setFullName} />
      <TextField
        label="Join Code"
        autoCapitalize="characters"
        placeholder="e.g. A1B2C3"
        value={code}
        onChangeText={setCode}
      />
      <Button
        title="Join Team"
        onPress={onSubmit}
        loading={loading}
        disabled={!code || (needsAccount && (!email || !password))}
      />
    </Screen>
  );
}
