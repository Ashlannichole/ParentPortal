import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function ErrorText({ children }: { children?: string | null }) {
  const { colors } = useTheme();
  if (!children) return null;
  return <Text style={[styles.text, { color: colors.danger }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 14, marginBottom: 10 },
});
