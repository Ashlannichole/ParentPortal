-- Adds parent-submitted lesson/open-gym requests, which a coach must
-- approve (turning them into a real `events` row + `event_signups`) or
-- decline. Run this in the Supabase SQL editor for an existing project that
-- already has schema.sql applied -- it only adds new objects, so it's safe
-- to run once alongside the original schema.

create type request_status as enum ('pending', 'approved', 'declined');

create table lesson_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  type event_type not null,
  requested_start timestamptz not null,
  requested_end timestamptz,
  note text,
  status request_status not null default 'pending',
  resolved_event_id uuid references events(id) on delete set null,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table lesson_requests enable row level security;

-- Coaches see and resolve every request for their team.
create policy "lesson_requests: coach can view" on lesson_requests
  for select using (is_team_coach(team_id));

create policy "lesson_requests: coach can update" on lesson_requests
  for update using (is_team_coach(team_id));

-- Parents see and manage only their own requests.
create policy "lesson_requests: requester can view own" on lesson_requests
  for select using (requested_by = auth.uid());

create policy "lesson_requests: requester can insert own" on lesson_requests
  for insert with check (
    requested_by = auth.uid()
    and is_team_member(team_id)
    and exists (
      select 1 from athletes a
      where a.id = lesson_requests.athlete_id and a.parent_user_id = auth.uid()
    )
  );

-- A parent can retract their own request only while it's still pending;
-- once a coach has acted on it, it's a record of that decision.
create policy "lesson_requests: requester can cancel pending" on lesson_requests
  for delete using (requested_by = auth.uid() and status = 'pending');

create policy "lesson_requests: coach can delete" on lesson_requests
  for delete using (is_team_coach(team_id));
