import { useEffect, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { SwagItem, SwagVote, VoteType } from '../lib/types';

export function useSwagItems() {
  const { teamMember } = useAuth();
  const teamId = teamMember?.team_id;
  const queryClient = useQueryClient();
  const instanceId = useId();

  const query = useQuery({
    queryKey: ['swag_items', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('swag_items')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at');
      if (error) throw error;
      return data as SwagItem[];
    },
    enabled: !!teamId,
  });

  useEffect(() => {
    if (!teamId) return;
    // Topic includes a per-instance id -- both the Home tab and the SWAG tab
    // call this hook, and React Navigation keeps blurred tabs mounted, so
    // two instances can be alive at once. Supabase's realtime client throws
    // if two channels share the same topic string.
    const channel = supabase
      .channel(`swag-${teamId}-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swag_votes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['swag_votes'] });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'swag_items', filter: `team_id=eq.${teamId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['swag_items', teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, instanceId, queryClient]);

  const addItem = useMutation({
    mutationFn: async (input: { name: string; image_url?: string | null }) => {
      const { error } = await supabase.from('swag_items').insert({ team_id: teamId, ...input });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swag_items', teamId] }),
  });

  return { ...query, addItem };
}

export function useSwagVotes(itemId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['swag_votes', itemId],
    queryFn: async () => {
      const { data, error } = await supabase.from('swag_votes').select('*').eq('item_id', itemId);
      if (error) throw error;
      return data as SwagVote[];
    },
    enabled: !!itemId,
  });

  const castVote = useMutation({
    mutationFn: async (vote: VoteType) => {
      const { error } = await supabase
        .from('swag_votes')
        .upsert({ item_id: itemId, user_id: session!.user.id, vote }, { onConflict: 'item_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swag_votes', itemId] }),
  });

  const retractVote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('swag_votes')
        .delete()
        .eq('item_id', itemId)
        .eq('user_id', session!.user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['swag_votes', itemId] }),
  });

  return { ...query, castVote, retractVote };
}
