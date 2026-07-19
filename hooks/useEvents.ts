import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { EventSignup, EventType, TeamEvent } from '../lib/types';

export function useEvents() {
  const { teamMember, session } = useAuth();
  const teamId = teamMember?.team_id;
  const isCoach = teamMember?.role === 'coach';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['events', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('team_id', teamId as string)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as TeamEvent[];
    },
    enabled: !!teamId,
  });

  const addEvent = useMutation({
    mutationFn: async (input: {
      type: EventType;
      title: string;
      location?: string | null;
      start_time: string;
      end_time?: string | null;
      capacity?: number | null;
    }) => {
      const { error } = await supabase.from('events').insert({
        team_id: teamId,
        created_by: session!.user.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', teamId] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', teamId] }),
  });

  return { ...query, isCoach, addEvent, deleteEvent };
}

export function useEventSignups(eventId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['event_signups', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_signups')
        .select('*, athletes(*)')
        .eq('event_id', eventId);
      if (error) throw error;
      return data as EventSignup[];
    },
    enabled: !!eventId,
  });

  const signUp = useMutation({
    mutationFn: async (athleteId: string) => {
      const { error } = await supabase
        .from('event_signups')
        .insert({ event_id: eventId, athlete_id: athleteId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event_signups', eventId] }),
  });

  const cancelSignup = useMutation({
    mutationFn: async (athleteId: string) => {
      const { error } = await supabase
        .from('event_signups')
        .delete()
        .eq('event_id', eventId)
        .eq('athlete_id', athleteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event_signups', eventId] }),
  });

  return { ...query, signUp, cancelSignup };
}
