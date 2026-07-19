import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Payment, PaymentStatus } from '../lib/types';

export function usePayments() {
  const { teamMember, session } = useAuth();
  const teamId = teamMember?.team_id;
  const isCoach = teamMember?.role === 'coach';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['payments', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, athletes(*)')
        .eq('team_id', teamId as string)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!teamId,
  });

  const addPayment = useMutation({
    mutationFn: async (input: {
      athlete_id: string;
      description: string;
      amount_cents: number;
      due_date?: string | null;
    }) => {
      const { error } = await supabase.from('payments').insert({
        team_id: teamId,
        created_by: session!.user.id,
        status: 'unpaid' as PaymentStatus,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', teamId] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaymentStatus }) => {
      const { error } = await supabase.from('payments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments', teamId] }),
  });

  return { ...query, isCoach, addPayment, setStatus };
}
