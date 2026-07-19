import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { useEvents, useEventSignups } from '../../hooks/useEvents';
import { useAthletes } from '../../hooks/useAthletes';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';
import { EVENT_TYPE_LABELS, EventType, TeamEvent } from '../../lib/types';

const EVENT_TYPES: EventType[] = ['practice', 'tournament', 'open_gym', 'scrimmage', 'private_lesson'];

function formatWhen(startISO: string, endISO: string | null) {
  const start = new Date(startISO);
  const datePart = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (!endISO) return `${datePart} · ${startTime}`;
  const endTime = new Date(endISO).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${startTime}–${endTime}`;
}

function EventRow({ event, isCoach, onDelete }: { event: TeamEvent; isCoach: boolean; onDelete: () => void }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { data: athletes } = useAthletes();
  const { data: signups, signUp, cancelSignup } = useEventSignups(event.id);
  const [expanded, setExpanded] = useState(false);

  const isPrivateLesson = event.type === 'private_lesson';
  const myAthletes = athletes ?? [];
  const signedUpAthleteIds = new Set((signups ?? []).map((s) => s.athlete_id));
  const isFull = event.capacity != null && (signups?.length ?? 0) >= event.capacity;

  return (
    <Card>
      <Pressable onPress={() => setExpanded((e) => !e)}>
        <View style={styles.rowTop}>
          <Text style={[styles.badge, { color: colors.accent }]}>{EVENT_TYPE_LABELS[event.type]}</Text>
          {isCoach ? (
            <Pressable onPress={onDelete}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 2 }}>{formatWhen(event.start_time, event.end_time)}</Text>
        {event.location ? <Text style={{ color: colors.textMuted }}>{event.location}</Text> : null}
      </Pressable>

      {isPrivateLesson ? (
        <View style={styles.signupSection}>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>
            {signups?.length ?? 0}
            {event.capacity != null ? ` / ${event.capacity}` : ''} signed up
          </Text>
          {isCoach && expanded ? (
            (signups ?? []).map((s) => (
              <Text key={s.id} style={{ color: colors.text }}>
                • {s.athletes?.name ?? 'Athlete'}
              </Text>
            ))
          ) : null}
          {!isCoach
            ? myAthletes.map((athlete) => {
                const signedUp = signedUpAthleteIds.has(athlete.id);
                return (
                  <View key={athlete.id} style={styles.athleteRow}>
                    <Text style={{ color: colors.text }}>{athlete.name}</Text>
                    <Pressable
                      onPress={() => (signedUp ? cancelSignup.mutate(athlete.id) : signUp.mutate(athlete.id))}
                      disabled={!signedUp && isFull}
                    >
                      <Text
                        style={{
                          color: signedUp ? colors.danger : isFull ? colors.textMuted : colors.primary,
                          fontWeight: '600',
                        }}
                      >
                        {signedUp ? 'Cancel' : isFull ? 'Full' : 'Sign Up'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })
            : null}
        </View>
      ) : null}
    </Card>
  );
}

export default function Calendar() {
  const { colors } = useTheme();
  const { teamMember } = useAuth();
  const isCoach = teamMember?.role === 'coach';
  const { data: events, isLoading, addEvent, deleteEvent } = useEvents();

  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState<EventType>('practice');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setType('practice');
    setTitle('');
    setLocation('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setCapacity('');
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    const start = new Date(`${date}T${startTime}`);
    if (isNaN(start.getTime())) {
      setError('Enter a valid date (YYYY-MM-DD) and start time (HH:MM).');
      return;
    }
    const end = endTime ? new Date(`${date}T${endTime}`) : null;

    try {
      await addEvent.mutateAsync({
        type,
        title: title.trim(),
        location: location.trim() || null,
        start_time: start.toISOString(),
        end_time: end && !isNaN(end.getTime()) ? end.toISOString() : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
      });
      setModalVisible(false);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add event.');
    }
  };

  return (
    <Screen>
      {isCoach ? (
        <Button title="+ Add to Calendar" onPress={() => setModalVisible(true)} />
      ) : null}
      <FlatList
        style={{ marginTop: 12 }}
        data={events ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventRow event={item} isCoach={isCoach} onDelete={() => deleteEvent.mutate(item.id)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
              No events on the calendar yet.
            </Text>
          ) : null
        }
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Screen scroll>
          <Text style={[styles.eventTitle, { color: colors.text, marginBottom: 16 }]}>Add to Calendar</Text>
          <ErrorText>{error}</ErrorText>
          <Text style={{ color: colors.textMuted, marginBottom: 6 }}>Type</Text>
          <View style={styles.typeRow}>
            {EVENT_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: type === t ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: type === t ? '#fff' : colors.text, fontSize: 13 }}>
                  {EVENT_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Tuesday Practice" />
          <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Gym, court #, address" />
          <TextField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-08-01" />
          <TextField label="Start Time (HH:MM, 24hr)" value={startTime} onChangeText={setStartTime} placeholder="18:00" />
          <TextField label="End Time (optional)" value={endTime} onChangeText={setEndTime} placeholder="19:30" />
          {type === 'private_lesson' ? (
            <TextField
              label="Capacity (optional)"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
              placeholder="e.g. 1"
            />
          ) : null}
          <Button title="Save" onPress={onSubmit} loading={addEvent.isPending} disabled={!title || !date || !startTime} />
          <View style={{ height: 10 }} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  badge: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  eventTitle: { fontSize: 17, fontWeight: '600' },
  signupSection: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#8884' },
  athleteRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
