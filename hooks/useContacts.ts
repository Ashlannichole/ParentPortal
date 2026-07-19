import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { TeamMember } from '../lib/types';

export function useContacts() {
  const { teamMember } = useAuth();
  const teamId = teamMember?.team_id;

  return useQuery({
    queryKey: ['contacts', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId as string)
        .order('role');
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useUpdateMyContactInfo() {
  const { teamMember, refreshTeamMember } = useAuth();
  const teamId = teamMember?.team_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fullName, phone }: { fullName: string; phone: string }) => {
      const { error } = await supabase.rpc('update_my_contact_info', {
        p_team_id: teamId,
        p_full_name: fullName || null,
        p_phone: phone || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshTeamMember();
      queryClient.invalidateQueries({ queryKey: ['contacts', teamId] });
    },
  });
}
