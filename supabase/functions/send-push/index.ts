// Supabase Edge Function: send-push
//
// Sends an Expo push notification to every member of a team. Deploy with:
//   supabase functions deploy send-push
//
// Invoke it (e.g. from a Database Webhook on `events` INSERT, or manually)
// with a POST body of: { "team_id": "...", "title": "...", "body": "...", "role": "coach" }
// `role` is optional -- omit it to notify every team member, or pass
// "coach" / "parent" to target only that role (e.g. a new lesson request
// should only alert coaches).
//
// This is a stub wired for the "new event" / "payment reminder" use cases
// described in the app plan -- hooking it up to fire automatically on
// inserts (via Supabase Database Webhooks) is a follow-up, not done here.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { team_id, title, body, role, user_id } = await req.json();
  if (!team_id || !title || !body) {
    return new Response(JSON.stringify({ error: 'team_id, title, and body are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let userIds: string[];
  if (user_id) {
    // Single-recipient notification (e.g. telling a parent their request
    // was approved/declined) -- skip the team_members lookup entirely.
    userIds = [user_id];
  } else {
    let membersQuery = supabase.from('team_members').select('user_id').eq('team_id', team_id);
    if (role) membersQuery = membersQuery.eq('role', role);

    const { data: members, error: membersError } = await membersQuery;
    if (membersError) {
      return new Response(JSON.stringify({ error: membersError.message }), { status: 500 });
    }
    userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  }

  if (userIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const { data: tokens, error: tokensError } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .in('user_id', userIds);

  if (tokensError) {
    return new Response(JSON.stringify({ error: tokensError.message }), { status: 500 });
  }

  const messages = (tokens ?? []).map((t: { expo_push_token: string }) => ({
    to: t.expo_push_token,
    title,
    body,
  }));

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await expoResponse.json();
  return new Response(JSON.stringify({ sent: messages.length, expoResult: result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
