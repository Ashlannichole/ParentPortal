import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';

export default function Dashboard() {
  const { colors } = useTheme();
  const { teamMember } = useAuth();
  const isCoach = teamMember?.role === 'coach';

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.text }]}>{teamMember?.teams.name}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        You're signed in as a {teamMember?.role === 'coach' ? 'Coach' : 'Parent'}.
      </Text>

      {isCoach ? (
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Share these with your team</Text>
          <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Coach join code</Text>
          <Text style={[styles.code, { color: colors.primary }]}>{teamMember?.teams.coach_code}</Text>
          <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Parent join code</Text>
          <Text style={[styles.code, { color: colors.primary }]}>{teamMember?.teams.parent_code}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Getting around</Text>
        <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
          Use the tabs below for the team Calendar, Payments, Contacts, About the Coaches, and
          SWAG voting. {isCoach ? 'As a coach you can add events, mark payments, and manage the roster.' : 'Add your athlete from the Settings tab so her payments and lesson signups show up.'}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  codeLabel: { fontSize: 12, marginTop: 8 },
  code: { fontSize: 22, fontWeight: '700', letterSpacing: 2 },
});
