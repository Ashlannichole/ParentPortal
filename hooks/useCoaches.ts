import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { CoachProfile } from '../lib/types';

export function useCoaches() {
  const { teamMember } = useAuth();
  const teamId = teamMember?.team_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['coaches', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('team_id', teamId as string)
        .order('created_at');
      if (error) throw error;
      return data as CoachProfile[];
    },
    enabled: !!teamId,
  });

  const upsertCoach = useMutation({
    mutationFn: async (input: { id?: string; name: string; bio?: string | null; photo_url?: string | null }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from('coaches').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coaches').insert({ team_id: teamId, ...input });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches', teamId] }),
  });

  const deleteCoach = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coaches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coaches', teamId] }),
  });

  return { ...query, upsertCoach, deleteCoach };
}
