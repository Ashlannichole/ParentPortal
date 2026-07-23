import { useEffect, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { notifyTeam } from '../lib/notifications';
import type { Announcement } from '../lib/types';

export function useAnnouncements() {
  const { teamMember, session } = useAuth();
  const teamId = teamMember?.team_id;
  const isCoach = teamMember?.role === 'coach';
  const queryClient = useQueryClient();
  const instanceId = useId();

  const query = useQuery({
    queryKey: ['announcements', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!teamId,
  });

  useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`announcements-${teamId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements', filter: `team_id=eq.${teamId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['announcements', teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, instanceId, queryClient]);

  const addAnnouncement = useMutation({
    mutationFn: async (input: { title: string; body: string }) => {
      const { error } = await supabase.from('announcements').insert({
        team_id: teamId,
        created_by: session!.user.id,
        ...input,
      });
      if (error) throw error;

      await notifyTeam(teamId as string, {
        title: 'New announcement',
        body: input.title,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', teamId] }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (announcement: Announcement) => {
      const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', teamId] }),
  });

  return { ...query, isCoach, addAnnouncement, deleteAnnouncement };
}
