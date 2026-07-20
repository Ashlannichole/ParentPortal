import { supabase } from './supabase';
import type { TeamRole } from './types';

// Best-effort push notification -- the Edge Function may not be deployed
// yet, or delivery can fail for other reasons, and none of that should ever
// block the underlying action (request/approve/signup/cancel/etc.) from
// succeeding.
async function notifyPush(body: Record<string, unknown>) {
  try {
    await supabase.functions.invoke('send-push', { body });
  } catch {
    // ignore -- see comment above
  }
}

interface NotificationContent {
  title: string;
  body: string;
}

export function notifyTeam(teamId: string, content: NotificationContent) {
  return notifyPush({ team_id: teamId, ...content });
}

export function notifyRole(teamId: string, role: TeamRole, content: NotificationContent) {
  return notifyPush({ team_id: teamId, role, ...content });
}

export function notifyUsers(teamId: string, userIds: string[], content: NotificationContent) {
  if (userIds.length === 0) return Promise.resolve();
  return notifyPush({ team_id: teamId, user_ids: userIds, ...content });
}
