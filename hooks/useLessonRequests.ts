import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { notifyRole, notifyTeam, notifyUsers } from '../lib/notifications';
import type { EventType, LessonRequest } from '../lib/types';

const ANNOUNCEABLE_TYPES: EventType[] = ['private_lesson', 'open_gym'];

export function useLessonRequests() {
  const { teamMember, session } = useAuth();
  const teamId = teamMember?.team_id;
  const isCoach = teamMember?.role === 'coach';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['lesson_requests', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_requests')
        .select('*, athletes(*)')
        .eq('team_id', teamId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LessonRequest[];
    },
    enabled: !!teamId,
  });

  useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`lesson-requests-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_requests', filter: `team_id=eq.${teamId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lesson_requests', teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  const pending = (query.data ?? []).filter((r) => r.status === 'pending');

  const submitRequest = useMutation({
    mutationFn: async (input: {
      athlete_id: string;
      type: EventType;
      requested_start: string;
      requested_end?: string | null;
      note?: string | null;
    }) => {
      const { error } = await supabase.from('lesson_requests').insert({
        team_id: teamId,
        requested_by: session!.user.id,
        ...input,
      });
      if (error) throw error;

      await notifyRole(teamId as string, 'coach', {
        title: 'New request',
        body: `A parent requested a ${input.type.replace('_', ' ')}.`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson_requests', teamId] }),
  });

  const approveRequest = useMutation({
    mutationFn: async ({
      request,
      eventInput,
    }: {
      request: LessonRequest;
      eventInput: { title: string; location?: string | null; start_time: string; end_time?: string | null; capacity?: number | null };
    }) => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          team_id: teamId,
          created_by: session!.user.id,
          type: request.type,
          ...eventInput,
        })
        .select()
        .single();
      if (eventError) throw eventError;

      const { error: signupError } = await supabase
        .from('event_signups')
        .insert({ event_id: event.id, athlete_id: request.athlete_id });
      if (signupError) throw signupError;

      const { error: updateError } = await supabase
        .from('lesson_requests')
        .update({
          status: 'approved',
          resolved_event_id: event.id,
          resolved_by: session!.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', request.id);
      if (updateError) throw updateError;

      // Broadcast to the whole team for private lessons/open gyms -- the
      // requester is a team member so they're included automatically, and
      // everyone else now knows there's a new slot to sign up for.
      if (ANNOUNCEABLE_TYPES.includes(request.type)) {
        await notifyTeam(teamId as string, {
          title: 'New sign-up available',
          body: `A ${request.type.replace('_', ' ')} was just scheduled -- sign up now!`,
        });
      } else {
        await notifyUsers(teamId as string, [request.requested_by], {
          title: 'Request approved',
          body: `Your ${request.type.replace('_', ' ')} request was approved.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['events', teamId] });
    },
  });

  const declineRequest = useMutation({
    mutationFn: async (request: LessonRequest) => {
      const { error } = await supabase
        .from('lesson_requests')
        .update({
          status: 'declined',
          resolved_by: session!.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', request.id);
      if (error) throw error;

      await notifyUsers(teamId as string, [request.requested_by], {
        title: 'Request declined',
        body: `Your ${request.type.replace('_', ' ')} request was declined.`,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson_requests', teamId] }),
  });

  return { ...query, isCoach, pending, submitRequest, approveRequest, declineRequest };
}
