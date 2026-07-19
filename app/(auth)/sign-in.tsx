import React, { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { ErrorText } from '../../components/ErrorText';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/ThemeProvider';

export default function SignIn() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace('/');
  };

  return (
    <Screen>
      <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
        Log in with the email and password you used to sign up.
      </Text>
      <ErrorText>{error}</ErrorText>
      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Log In" onPress={onSubmit} loading={loading} disabled={!email || !password} />
    </Screen>
  );
}
