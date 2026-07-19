import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useSwagItems, useSwagVotes } from '../../hooks/useSwag';
import { useLessonRequests } from '../../hooks/useLessonRequests';
import { useTheme } from '../../theme/ThemeProvider';
import { EVENT_TYPE_LABELS } from '../../lib/types';
import { formatEventWhen } from '../../lib/format';

export default function Dashboard() {
  const { colors } = useTheme();
  const { teamMember, session } = useAuth();
  const isCoach = teamMember?.role === 'coach';

  const { data: events } = useEvents();
  const { data: swagItems } = useSwagItems();
  const { pending } = useLessonRequests();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (events ?? [])
      .filter((e) => new Date(e.start_time).getTime() >= now)
      .slice(0, 5);
  }, [events]);

  const latestSwagItem = swagItems && swagItems.length > 0 ? swagItems[swagItems.length - 1] : null;
  const { data: swagVotes, castVote, retractVote } = useSwagVotes(latestSwagItem?.id ?? '');
  const upCount = (swagVotes ?? []).filter((v) => v.vote === 'up').length;
  const downCount = (swagVotes ?? []).filter((v) => v.vote === 'down').length;
  const myVote = (swagVotes ?? []).find((v) => v.user_id === session?.user.id)?.vote ?? null;

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.text }]}>{teamMember?.teams.name}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        You're signed in as a {isCoach ? 'Coach' : 'Parent'}.
      </Text>

      {isCoach && pending.length > 0 ? (
        <Pressable onPress={() => router.push('/calendar')}>
          <Card style={{ borderColor: colors.accent }}>
            <View style={styles.row}>
              <Ionicons name="notifications" size={18} color={colors.accent} />
              <Text style={{ color: colors.text, marginLeft: 8, fontWeight: '600' }}>
                {pending.length} pending request{pending.length === 1 ? '' : 's'} — tap to review
              </Text>
            </View>
          </Card>
        </Pressable>
      ) : null}

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
        <Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming</Text>
        {upcoming.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>Nothing on the calendar yet.</Text>
        ) : (
          upcoming.map((event) => (
            <Pressable key={event.id} onPress={() => router.push('/calendar')} style={styles.upcomingRow}>
              <Text style={[styles.badge, { color: colors.accent }]}>{EVENT_TYPE_LABELS[event.type]}</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{event.title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {formatEventWhen(event.start_time, event.end_time)}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>SWAG</Text>
        {latestSwagItem ? (
          <>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 10 }}>{latestSwagItem.name}</Text>
            <View style={styles.voteRow}>
              <Pressable
                onPress={() => (myVote === 'up' ? retractVote.mutate() : castVote.mutate('up'))}
                style={[styles.voteButton, { borderColor: colors.border, backgroundColor: myVote === 'up' ? colors.success : 'transparent' }]}
              >
                <Ionicons name="thumbs-up" size={16} color={myVote === 'up' ? '#fff' : colors.text} />
                <Text style={{ color: myVote === 'up' ? '#fff' : colors.text, marginLeft: 6 }}>{upCount}</Text>
              </Pressable>
              <Pressable
                onPress={() => (myVote === 'down' ? retractVote.mutate() : castVote.mutate('down'))}
                style={[styles.voteButton, { borderColor: colors.border, backgroundColor: myVote === 'down' ? colors.danger : 'transparent' }]}
              >
                <Ionicons name="thumbs-down" size={16} color={myVote === 'down' ? '#fff' : colors.text} />
                <Text style={{ color: myVote === 'down' ? '#fff' : colors.text, marginLeft: 6 }}>{downCount}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={{ color: colors.textMuted, marginBottom: 10 }}>Nothing to vote on yet.</Text>
        )}
        <View style={{ height: 10 }} />
        <Button title="See all SWAG" variant="secondary" onPress={() => router.push('/swag')} />
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
  row: { flexDirection: 'row', alignItems: 'center' },
  upcomingRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#8884' },
  badge: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
