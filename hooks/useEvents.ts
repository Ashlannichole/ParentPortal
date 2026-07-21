import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { notifyRole, notifyTeam, notifyUsers } from '../lib/notifications';
import type { EventSignup, EventType, TeamEvent } from '../lib/types';

const ANNOUNCEABLE_TYPES: EventType[] = ['private_lesson', 'open_gym'];

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

      if (ANNOUNCEABLE_TYPES.includes(input.type)) {
        await notifyTeam(teamId as string, {
          title: 'New sign-up available',
          body: `${input.title} was just scheduled -- sign up now!`,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', teamId] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (event: TeamEvent) => {
      const { data: signups, error: signupsError } = await supabase
        .from('event_signups')
        .select('*, athletes(*)')
        .eq('event_id', event.id);
      if (signupsError) throw signupsError;

      const { error } = await supabase.from('events').delete().eq('id', event.id);
      if (error) throw error;

      const parentIds = ((signups ?? []) as EventSignup[])
        .map((s) => s.athletes?.parent_user_id)
        .filter((id): id is string => !!id);

      await notifyUsers(teamId as string, parentIds, {
        title: 'Event cancelled',
        body: `${event.title} on ${new Date(event.start_time).toLocaleDateString()} was cancelled.`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events', teamId] }),
  });

  return { ...query, isCoach, addEvent, deleteEvent };
}

export function useEventSignups(event: TeamEvent) {
  const { teamMember, session } = useAuth();
  const teamId = teamMember?.team_id as string;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['event_signups', event.id],
    queryFn: async () => {
      // private_lesson_payments has no parent-facing RLS policy at all, so
      // this embed simply comes back empty for a parent's session -- no
      // error, no special-casing needed here.
      const { data, error } = await supabase
        .from('event_signups')
        .select('*, athletes(*), private_lesson_payments(*)')
        .eq('event_id', event.id);
      if (error) throw error;
      return data as EventSignup[];
    },
    enabled: !!event.id,
  });

  const signUp = useMutation({
    mutationFn: async (athlete: { id: string; name: string }) => {
      const { error } = await supabase
        .from('event_signups')
        .insert({ event_id: event.id, athlete_id: athlete.id });
      if (error) throw error;

      await notifyRole(teamId, 'coach', {
        title: 'New sign-up',
        body: `${athlete.name} signed up for ${event.title}.`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event_signups', event.id] }),
  });

  const cancelSignup = useMutation({
    mutationFn: async (athlete: { id: string; name: string }) => {
      const others = (query.data ?? []).filter((s) => s.athlete_id !== athlete.id);

      const { error } = await supabase
        .from('event_signups')
        .delete()
        .eq('event_id', event.id)
        .eq('athlete_id', athlete.id);
      if (error) throw error;

      await notifyRole(teamId, 'coach', {
        title: 'Sign-up cancelled',
        body: `${athlete.name} cancelled their spot in ${event.title}.`,
      });

      const otherParentIds = others
        .map((s) => s.athletes?.parent_user_id)
        .filter((id): id is string => !!id);
      await notifyUsers(teamId, otherParentIds, {
        title: 'Spot opened up',
        body: `${athlete.name} cancelled their spot in ${event.title} -- there's room now.`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event_signups', event.id] }),
  });

  const setPaid = useMutation({
    mutationFn: async ({ eventSignupId, paid }: { eventSignupId: string; paid: boolean }) => {
      const { error } = await supabase.from('private_lesson_payments').upsert(
        { event_signup_id: eventSignupId, paid, updated_by: session!.user.id, updated_at: new Date().toISOString() },
        { onConflict: 'event_signup_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event_signups', event.id] }),
  });

  return { ...query, signUp, cancelSignup, setPaid };
}
