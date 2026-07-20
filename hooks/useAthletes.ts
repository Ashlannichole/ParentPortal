import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Athlete } from '../lib/types';

export function useAthletes() {
  const { teamMember, session } = useAuth();
  const teamId = teamMember?.team_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['athletes', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('team_id', teamId as string)
        .order('name');
      if (error) throw error;
      return data as Athlete[];
    },
    enabled: !!teamId,
  });

  const addAthlete = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('athletes').insert({
        team_id: teamId,
        parent_user_id: session!.user.id,
        name,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['athletes', teamId] }),
  });

  const updateAthlete = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('athletes').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['athletes', teamId] }),
  });

  return { ...query, addAthlete, updateAthlete };
}
