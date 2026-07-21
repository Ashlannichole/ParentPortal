import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ErrorText } from '../../components/ErrorText';
import { DateField } from '../../components/DateField';
import { TimeField } from '../../components/TimeField';
import { useEvents, useEventSignups } from '../../hooks/useEvents';
import { useAthletes } from '../../hooks/useAthletes';
import { useLessonRequests } from '../../hooks/useLessonRequests';
import { useCalendarBadge } from '../../hooks/useCalendarBadge';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../theme/ThemeProvider';
import { EVENT_TYPE_LABELS, EventType, LessonRequest, TeamEvent } from '../../lib/types';
import { formatEventWhen } from '../../lib/format';

const EVENT_TYPES: EventType[] = ['practice', 'tournament', 'open_gym', 'scrimmage', 'private_lesson'];
const REQUESTABLE_TYPES: EventType[] = ['private_lesson', 'open_gym'];
const SIGNUP_TYPES: EventType[] = ['private_lesson', 'open_gym'];

function toDateKey(input: string | Date) {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function combineDateAndTime(date: Date | null, time: Date | null): Date | null {
  if (!date || !time) return null;
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

const ROSTER_PREVIEW_COUNT = 4;

function EventRow({ event, isCoach, onDelete }: { event: TeamEvent; isCoach: boolean; onDelete: () => void }) {
  const { colors } = useTheme();
  const { data: athletes } = useAthletes();
  const { data: signups, signUp, cancelSignup, setPaid } = useEventSignups(event);
  const [showAll, setShowAll] = useState(false);

  const hasSignups = SIGNUP_TYPES.includes(event.type);
  const myAthletes = athletes ?? [];
  const allSignups = signups ?? [];
  const signedUpAthleteIds = new Set(allSignups.map((s) => s.athlete_id));
  const isFull = event.capacity != null && allSignups.length >= event.capacity;

  const isPrivateLesson = event.type === 'private_lesson';
  const canCollapse = !isPrivateLesson && allSignups.length > ROSTER_PREVIEW_COUNT;
  const visibleSignups = isPrivateLesson || showAll ? allSignups : allSignups.slice(0, ROSTER_PREVIEW_COUNT);

  const confirmDelete = () => {
    Alert.alert(
      'Cancel this event?',
      `This will remove "${event.title}" and notify anyone signed up.`,
      [
        { text: 'Keep It', style: 'cancel' },
        { text: 'Cancel Event', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Card>
      <View style={styles.rowTop}>
        <Text style={[styles.badge, { color: colors.accent }]}>{EVENT_TYPE_LABELS[event.type]}</Text>
        {isCoach ? (
          <Pressable onPress={confirmDelete}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>Cancel Event</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 2 }}>{formatEventWhen(event.start_time, event.end_time)}</Text>
      {event.location ? <Text style={{ color: colors.textMuted }}>{event.location}</Text> : null}

      {hasSignups ? (
        <View style={styles.signupSection}>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>
            {allSignups.length}
            {event.capacity != null ? ` / ${event.capacity}` : ''} signed up
          </Text>
          {visibleSignups.map((s) => {
            const paid = s.private_lesson_payments?.paid ?? false;
            return (
              <View key={s.id} style={styles.athleteRow}>
                <Text style={{ color: colors.text }}>{s.athletes?.name ?? 'Athlete'}</Text>
                {isCoach && event.type === 'private_lesson' ? (
                  <Pressable onPress={() => setPaid.mutate({ eventSignupId: s.id, paid: !paid })}>
                    <Text style={{ color: paid ? colors.success : colors.danger, fontWeight: '600' }}>
                      {paid ? 'Paid' : 'Unpaid'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {canCollapse ? (
            <Pressable onPress={() => setShowAll((v) => !v)}>
              <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 6 }}>
                {showAll ? 'Show less' : `Show all (${allSignups.length})`}
              </Text>
            </Pressable>
          ) : null}
          {!isCoach
            ? myAthletes.map((athlete) => {
                const signedUp = signedUpAthleteIds.has(athlete.id);
                return (
                  <View key={athlete.id} style={styles.athleteRow}>
                    <Text style={{ color: colors.text }}>{athlete.name}</Text>
                    <Pressable
                      onPress={() =>
                        signedUp ? cancelSignup.mutate(athlete) : signUp.mutate(athlete)
                      }
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
  const { markSeen } = useCalendarBadge();

  useFocusEffect(
    React.useCallback(() => {
      markSeen();
    }, [markSeen])
  );

  const [view, setView] = useState<'calendar' | 'requests'>('calendar');
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  // Add/edit-event modal (coach) -- also used to approve a request, prefilled.
  const [modalVisible, setModalVisible] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<LessonRequest | null>(null);
  const [type, setType] = useState<EventType>('practice');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Request-a-time modal (parent).
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reqAthleteId, setReqAthleteId] = useState<string | null>(null);
  const [reqType, setReqType] = useState<EventType>('private_lesson');
  const [reqDate, setReqDate] = useState<Date | null>(null);
  const [reqTime, setReqTime] = useState<Date | null>(null);
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
    setEventDate(null);
    setStartTime(null);
    setEndTime(null);
    setCapacity('');
    setError(null);
    setApprovingRequest(null);
  };

  const openAddModal = () => {
    resetEventForm();
    setEventDate(new Date(`${selectedDate}T00:00:00`));
    setModalVisible(true);
  };

  const openApproveModal = (request: LessonRequest) => {
    resetEventForm();
    setApprovingRequest(request);
    setType(request.type);
    setTitle(EVENT_TYPE_LABELS[request.type]);
    setEventDate(new Date(request.requested_start));
    setStartTime(new Date(request.requested_start));
    setEndTime(request.requested_end ? new Date(request.requested_end) : null);
    setCapacity(request.type === 'private_lesson' ? '1' : '');
    setModalVisible(true);
  };

  const onSubmitEventModal = async () => {
    setError(null);
    const start = combineDateAndTime(eventDate, startTime);
    if (!start) {
      setError('Pick a date and start time.');
      return;
    }
    const end = combineDateAndTime(eventDate, endTime);
    const eventInput = {
      type,
      title: title.trim(),
      location: location.trim() || null,
      start_time: start.toISOString(),
      end_time: end ? end.toISOString() : null,
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
    setReqDate(null);
    setReqTime(null);
    setReqNote('');
    setReqError(null);
  };

  const onSubmitRequest = async () => {
    setReqError(null);
    const start = combineDateAndTime(reqDate, reqTime);
    if (!reqAthleteId || !start) {
      setReqError('Pick your athlete, a date, and a time.');
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
                <EventRow key={event.id} event={event} isCoach={isCoach} onDelete={() => deleteEvent.mutate(event)} />
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
          <DateField label="Date" value={eventDate} onChange={setEventDate} />
          <TimeField label="Start Time" value={startTime} onChange={setStartTime} />
          <TimeField label="End Time (optional)" value={endTime} onChange={setEndTime} />
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
            disabled={!title || !eventDate || !startTime}
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
          <DateField label="Preferred Date" value={reqDate} onChange={setReqDate} />
          <TimeField label="Preferred Time" value={reqTime} onChange={setReqTime} />
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
