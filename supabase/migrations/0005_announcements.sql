-- Adds a coach-authored team announcements feed. This is what replaced the
-- Payments tab in the parent portal's tab bar (payments moved to a small
-- section on Home for parents; coaches keep the full Payments tab). Run
-- this in the Supabase SQL editor alongside what you already have.

create table announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

create policy "announcements: members can view" on announcements
  for select using (is_team_member(team_id));

create policy "announcements: coach can insert" on announcements
  for insert with check (is_team_coach(team_id));

create policy "announcements: coach can update" on announcements
  for update using (is_team_coach(team_id));

create policy "announcements: coach can delete" on announcements
  for delete using (is_team_coach(team_id));

alter publication supabase_realtime add table announcements;

-- Full replica identity so DELETE broadcasts carry the whole old row
-- (specifically team_id) -- Realtime needs this to authorize the change
-- under RLS, same reasoning as the other team-scoped tables.
alter table announcements replica identity full;
