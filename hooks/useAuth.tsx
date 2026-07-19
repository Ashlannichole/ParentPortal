import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { TeamMember } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  teamMember: TeamMember | null;
  loading: boolean;
  refreshTeamMember: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeamMember = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setTeamMember(null);
      return;
    }
    const { data } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', userId)
      .maybeSingle();
    setTeamMember((data as unknown as TeamMember) ?? null);
  }, []);

  // Reads the session fresh from the SDK rather than the `session` state
  // above -- this is called right after sign-up/sign-in, and the
  // onAuthStateChange listener that updates `session` state fires
  // asynchronously, so the state closure here can still be stale/null at
  // that moment even though the SDK already has the new session.
  const refreshTeamMember = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadTeamMember(data.session?.user.id);
  }, [loadTeamMember]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadTeamMember(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      await loadTeamMember(newSession?.user.id);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadTeamMember]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setTeamMember(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, teamMember, loading, refreshTeamMember, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
