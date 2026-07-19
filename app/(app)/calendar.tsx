import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { useEvents, useEventSignups } from '../../hooks/useEvents';
import { useAthletes } from '../../hooks/useAthletes';
import { useLessonRequests } from '../../hooks/useLessonRequests';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';
import { EVENT_TYPE_LABELS, EventType, LessonRequest, TeamEvent } from '../../lib/types';
import { formatEventWhen } from '../../lib/format';

const EVENT_TYPES: EventType[] = ['practice', 'tournament', 'open_gym', 'scrimmage', 'private_lesson'];
const REQUESTABLE_TYPES: EventType[] = ['private_lesson', 'open_gym'];

function toDateKey(input: string | Date) {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function EventRow({ event, isCoach, onDelete }: { event: TeamEvent; isCoach: boolean; onDelete: () => void }) {
  const { colors } = useTheme();
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
        <Text style={{ color: colors.textMuted, marginTop: 2 }}>{formatEventWhen(event.start_time, event.end_time)}</Text>
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

function RequestRow({
  request,
  onApprove,
  onDecline,
}: {
  request: LessonRequest;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[styles.badge, { color: colors.accent }]}>{EVENT_TYPE_LABELS[request.type]}</Text>
      <Text style={[styles.eventTitle, { color: colors.text }]}>{request.athletes?.name ?? 'Athlete'}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 2 }}>
        {formatEventWhen(request.requested_start, request.requested_end)}
      </Text>
      {request.note ? <Text style={{ color: colors.textMuted, marginTop: 4 }}>"{request.note}"</Text> : null}
      <View style={[styles.rowTop, { marginTop: 12, marginBottom: 0 }]}>
        <Button title="Decline" variant="secondary" onPress={onDecline} />
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}>
          <Button title="Approve" onPress={onApprove} />
        </View>
      </View>
    </Card>
  );
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { teamMember } = useAuth();
  const isCoach = teamMember?.role === 'coach';
  const { data: events, addEvent, deleteEvent } = useEvents();
  const { data: athletes } = useAthletes();
  const { pending, submitRequest, approveRequest, declineRequest } = useLessonRequests();

  const [view, setView] = useState<'calendar' | 'requests'>('calendar');
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  // Add/edit-event modal (coach) -- also used to approve a request, prefilled.
  const [modalVisible, setModalVisible] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<LessonRequest | null>(null);
  const [type, setType] = useState<EventType>('practice');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Request-a-time modal (parent).
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reqAthleteId, setReqAthleteId] = useState<string | null>(null);
  const [reqType, setReqType] = useState<EventType>('private_lesson');
  const [reqDate, setReqDate] = useState('');
  const [reqTime, setReqTime] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [reqError, setReqError] = useState<string | null>(null);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const e of events ?? []) {
      const key = toDateKey(e.start_time);
      marks[key] = { ...marks[key], marked: true, dotColor: colors.accent };
    }
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary };
    return marks;
  }, [events, selectedDate, colors]);

  const dayEvents = (events ?? [])
    .filter((e) => toDateKey(e.start_time) === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const resetEventForm = () => {
    setType('practice');
    setTitle('');
    setLocation('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setCapacity('');
    setError(null);
    setApprovingRequest(null);
  };

  const openAddModal = () => {
    resetEventForm();
    setDate(selectedDate);
    setModalVisible(true);
  };

  const openApproveModal = (request: LessonRequest) => {
    resetEventForm();
    setApprovingRequest(request);
    setType(request.type);
    setTitle(EVENT_TYPE_LABELS[request.type]);
    setDate(toDateKey(request.requested_start));
    setStartTime(toTimeStr(new Date(request.requested_start)));
    setEndTime(request.requested_end ? toTimeStr(new Date(request.requested_end)) : '');
    setCapacity(request.type === 'private_lesson' ? '1' : '');
    setModalVisible(true);
  };

  const onSubmitEventModal = async () => {
    setError(null);
    const start = new Date(`${date}T${startTime}`);
    if (isNaN(start.getTime())) {
      setError('Enter a valid date (YYYY-MM-DD) and start time (HH:MM).');
      return;
    }
    const end = endTime ? new Date(`${date}T${endTime}`) : null;
    const eventInput = {
      type,
      title: title.trim(),
      location: location.trim() || null,
      start_time: start.toISOString(),
      end_time: end && !isNaN(end.getTime()) ? end.toISOString() : null,
      capacity: capacity ? parseInt(capacity, 10) : null,
    };

    try {
      if (approvingRequest) {
        await approveRequest.mutateAsync({ request: approvingRequest, eventInput });
      } else {
        await addEvent.mutateAsync(eventInput);
      }
      setModalVisible(false);
      resetEventForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save event.');
    }
  };

  const resetRequestForm = () => {
    setReqAthleteId(null);
    setReqType('private_lesson');
    setReqDate('');
    setReqTime('');
    setReqNote('');
    setReqError(null);
  };

  const onSubmitRequest = async () => {
    setReqError(null);
    const start = new Date(`${reqDate}T${reqTime}`);
    if (!reqAthleteId || isNaN(start.getTime())) {
      setReqError('Pick your athlete and enter a valid date and time.');
      return;
    }
    try {
      await submitRequest.mutateAsync({
        athlete_id: reqAthleteId,
        type: reqType,
        requested_start: start.toISOString(),
        note: reqNote.trim() || null,
      });
      setRequestModalVisible(false);
      resetRequestForm();
    } catch (e) {
      setReqError(e instanceof Error ? e.message : 'Could not submit request.');
    }
  };

  return (
    <Screen scroll>
      {isCoach ? (
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setView('calendar')}
            style={[styles.segment, { borderColor: colors.border, backgroundColor: view === 'calendar' ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: view === 'calendar' ? '#fff' : colors.text, fontWeight: '600' }}>Calendar</Text>
          </Pressable>
          <Pressable
            onPress={() => setView('requests')}
            style={[styles.segment, { borderColor: colors.border, backgroundColor: view === 'requests' ? colors.primary : 'transparent' }]}
          >
            <Text style={{ color: view === 'requests' ? '#fff' : colors.text, fontWeight: '600' }}>
              Requests{pending.length > 0 ? ` (${pending.length})` : ''}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {view === 'requests' && isCoach ? (
        <View>
          {pending.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
              No pending requests.
            </Text>
          ) : (
            pending.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                onApprove={() => openApproveModal(request)}
                onDecline={() => declineRequest.mutate(request)}
              />
            ))
          )}
        </View>
      ) : (
        <View>
          <Card style={{ padding: 4 }}>
            <Calendar
              current={selectedDate}
              markedDates={markedDates}
              onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                textSectionTitleColor: colors.textMuted,
                dayTextColor: colors.text,
                monthTextColor: colors.text,
                textDisabledColor: colors.tabIconInactive,
                arrowColor: colors.primary,
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#fff',
                dotColor: colors.accent,
              }}
            />
          </Card>

          {isCoach ? (
            <Button title="+ Add to Calendar" onPress={openAddModal} />
          ) : (
            <Button title="Request a Time" onPress={() => setRequestModalVisible(true)} />
          )}

          <View style={{ marginTop: 12 }}>
            {dayEvents.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>
                Nothing on this day.
              </Text>
            ) : (
              dayEvents.map((event) => (
                <EventRow key={event.id} event={event} isCoach={isCoach} onDelete={() => deleteEvent.mutate(event.id)} />
              ))
            )}
          </View>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Screen scroll>
          <Text style={[styles.eventTitle, { color: colors.text, marginBottom: 16 }]}>
            {approvingRequest ? 'Approve Request' : 'Add to Calendar'}
          </Text>
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
          <Button
            title="Save"
            onPress={onSubmitEventModal}
            loading={addEvent.isPending || approveRequest.isPending}
            disabled={!title || !date || !startTime}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setModalVisible(false);
              resetEventForm();
            }}
          />
        </Screen>
      </Modal>

      <Modal visible={requestModalVisible} animationType="slide" onRequestClose={() => setRequestModalVisible(false)}>
        <Screen scroll>
          <Text style={[styles.eventTitle, { color: colors.text, marginBottom: 16 }]}>Request a Time</Text>
          <ErrorText>{reqError}</ErrorText>
          <Text style={{ color: colors.textMuted, marginBottom: 6 }}>Athlete</Text>
          <View style={styles.typeRow}>
            {(athletes ?? []).map((a) => (
              <Pressable
                key={a.id}
                onPress={() => setReqAthleteId(a.id)}
                style={[
                  styles.typeChip,
                  { borderColor: colors.border, backgroundColor: reqAthleteId === a.id ? colors.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: reqAthleteId === a.id ? '#fff' : colors.text, fontSize: 13 }}>{a.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: colors.textMuted, marginBottom: 6 }}>Type</Text>
          <View style={styles.typeRow}>
            {REQUESTABLE_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setReqType(t)}
                style={[
                  styles.typeChip,
                  { borderColor: colors.border, backgroundColor: reqType === t ? colors.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: reqType === t ? '#fff' : colors.text, fontSize: 13 }}>{EVENT_TYPE_LABELS[t]}</Text>
              </Pressable>
            ))}
          </View>
          <TextField label="Preferred Date (YYYY-MM-DD)" value={reqDate} onChangeText={setReqDate} placeholder="2026-08-01" />
          <TextField label="Preferred Time (HH:MM, 24hr)" value={reqTime} onChangeText={setReqTime} placeholder="18:00" />
          <TextField label="Note (optional)" value={reqNote} onChangeText={setReqNote} multiline numberOfLines={3} />
          <Button
            title="Send Request"
            onPress={onSubmitRequest}
            loading={submitRequest.isPending}
            disabled={!reqAthleteId || !reqDate || !reqTime}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setRequestModalVisible(false);
              resetRequestForm();
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
  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
});
