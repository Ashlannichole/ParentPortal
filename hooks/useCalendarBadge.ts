import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useEvents } from './useEvents';
import { useLessonRequests } from './useLessonRequests';
import type { EventType } from '../lib/types';

const SIGNUP_TYPES: EventType[] = ['private_lesson', 'open_gym'];
const EPOCH = '1970-01-01T00:00:00.000Z';

function storageKey(teamId: string) {
  return `calendar-last-seen-${teamId}`;
}

// Backed by react-query (not local component state) so every instance of
// this hook -- the tab bar badge in _layout.tsx and the Calendar screen
// itself both use it -- reacts to the same "last seen" value instead of
// each keeping its own stale copy.
export function useCalendarBadge() {
  const { teamMember } = useAuth();
  const teamId = teamMember?.team_id;
  const isCoach = teamMember?.role === 'coach';
  const { data: events } = useEvents();
  const { pending } = useLessonRequests();
  const queryClient = useQueryClient();

  const lastSeenQueryKey = ['calendar-last-seen', teamId];

  const { data: lastSeen } = useQuery({
    queryKey: lastSeenQueryKey,
    queryFn: async () => (await AsyncStorage.getItem(storageKey(teamId as string))) ?? EPOCH,
    enabled: !!teamId,
  });

  const markSeen = async () => {
    if (!teamId) return;
    const now = new Date().toISOString();
    await AsyncStorage.setItem(storageKey(teamId), now);
    queryClient.setQueryData(lastSeenQueryKey, now);
  };

  let badgeCount = 0;
  if (isCoach) {
    badgeCount = pending.length;
  } else if (lastSeen) {
    badgeCount = (events ?? []).filter(
      (e) => SIGNUP_TYPES.includes(e.type) && e.created_at > lastSeen
    ).length;
  }

  return { badgeCount, markSeen };
}
