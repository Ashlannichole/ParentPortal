-- Volleyball Parent Portal schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query) once
-- you've created your Supabase project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type team_role as enum ('coach', 'parent');
create type payment_status as enum ('paid', 'unpaid');
create type event_type as enum ('practice', 'tournament', 'open_gym', 'scrimmage', 'private_lesson');
create type vote_type as enum ('up', 'down');
create type request_status as enum ('pending', 'approved', 'declined');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coach_code text not null unique,
  parent_code text not null unique,
  created_at timestamptz not null default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role team_role not null,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table athletes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  description text not null,
  amount_cents integer not null,
  status payment_status not null default 'unpaid',
  due_date date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- History ledger for partial payments against a due item -- lets coaches
-- track club-dues payment plans over a season instead of a single
-- paid/unpaid toggle.
create table payment_installments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount_cents integer not null,
  paid_at date not null default current_date,
  recorded_by uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table coaches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  bio text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  type event_type not null,
  title text not null,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  capacity integer,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table event_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, athlete_id)
);

-- Coach-only private-lesson payment tracking. Deliberately its own table
-- rather than a column on event_signups: RLS is row-level, so a `paid`
-- column there (which parents can already read, for the roster) couldn't
-- be hidden from them without hiding the whole row. A separate table with
-- no parent-facing policy enforces "coach only" at the database level.
create table private_lesson_payments (
  id uuid primary key default gen_random_uuid(),
  event_signup_id uuid not null references event_signups(id) on delete cascade unique,
  paid boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table swag_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table swag_votes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references swag_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote vote_type not null,
  created_at timestamptz not null default now(),
  unique (item_id, user_id)
);

create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  updated_at timestamptz not null default now()
);

-- Parent-submitted requests for a private lesson / open gym at a specific
-- time; stays 'pending' until a coach approves (creating a real `events`
-- row + `event_signups`) or declines.
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

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can check membership
-- without recursive policy lookups on team_members itself)
-- ---------------------------------------------------------------------------
create or replace function is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function is_team_coach(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid() and role = 'coach'
  );
$$;

create or replace function generate_team_code()
returns text
language sql
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

-- Creates a team and makes the calling user its first coach. Client calls
-- this instead of inserting into teams/team_members directly.
create or replace function create_team(p_name text, p_full_name text default null, p_email text default null)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team teams;
  v_coach_code text;
  v_parent_code text;
begin
  loop
    v_coach_code := generate_team_code();
    exit when not exists (
      select 1 from teams where coach_code = v_coach_code or parent_code = v_coach_code
    );
  end loop;

  loop
    v_parent_code := generate_team_code();
    exit when not exists (
      select 1 from teams where coach_code = v_parent_code or parent_code = v_parent_code
    );
  end loop;

  insert into teams (name, coach_code, parent_code)
  values (p_name, v_coach_code, v_parent_code)
  returning * into v_team;

  insert into team_members (team_id, user_id, role, full_name, email)
  values (v_team.id, auth.uid(), 'coach', p_full_name, p_email);

  return v_team;
end;
$$;

-- Joins a team using either its coach code or parent code. Role is inferred
-- from which code matched, so a parent-facing invite link can never grant
-- coach access.
create or replace function join_team(p_code text, p_full_name text default null, p_email text default null)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team teams;
  v_role team_role;
begin
  select * into v_team from teams
  where coach_code = upper(p_code) or parent_code = upper(p_code);

  if not found then
    raise exception 'Invalid team code';
  end if;

  v_role := case when v_team.coach_code = upper(p_code) then 'coach' else 'parent' end;

  insert into team_members (team_id, user_id, role, full_name, email)
  values (v_team.id, auth.uid(), v_role, p_full_name, p_email)
  on conflict (team_id, user_id) do update set role = excluded.role;

  return v_team;
end;
$$;

-- Lets a member update their own contact info (name/phone) without touching
-- role or team_id -- a direct UPDATE policy on team_members would let a
-- parent promote themselves to coach, so this is deliberately the only way.
create or replace function update_my_contact_info(p_team_id uuid, p_full_name text, p_phone text, p_email text default null)
returns void
language sql
security definer
set search_path = public
as $$
  update team_members
  set full_name = p_full_name, phone = p_phone, email = coalesce(p_email, email)
  where team_id = p_team_id and user_id = auth.uid();
$$;

grant execute on function create_team(text, text, text) to authenticated;
grant execute on function join_team(text, text, text) to authenticated;
grant execute on function update_my_contact_info(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table teams enable row level security;
alter table team_members enable row level security;
alter table athletes enable row level security;
alter table payments enable row level security;
alter table coaches enable row level security;
alter table events enable row level security;
alter table event_signups enable row level security;
alter table swag_items enable row level security;
alter table swag_votes enable row level security;
alter table push_tokens enable row level security;
alter table lesson_requests enable row level security;
alter table payment_installments enable row level security;
alter table private_lesson_payments enable row level security;

-- teams: members can see their own team's row (name/codes). No direct
-- insert/update policy -- team creation/joining goes through the RPCs above.
create policy "teams: members can view" on teams
  for select using (is_team_member(id));

-- team_members: any member of a team can see its roster (needed for the
-- contacts directory and coach list).
create policy "team_members: members can view roster" on team_members
  for select using (is_team_member(team_id));

-- athletes: any team member can see the whole roster (used to show whose
-- daughter is whose in the Team Info directory).
create policy "athletes: view" on athletes
  for select using (is_team_member(team_id));

create policy "athletes: parent can add own" on athletes
  for insert with check (parent_user_id = auth.uid() and is_team_member(team_id));

create policy "athletes: parent or coach can update" on athletes
  for update using (parent_user_id = auth.uid() or is_team_coach(team_id));

create policy "athletes: parent or coach can delete" on athletes
  for delete using (parent_user_id = auth.uid() or is_team_coach(team_id));

-- payments: tracking only. Coaches have full read/write; parents can read
-- only their own athlete's ledger and never write (mark paid/unpaid is a
-- coach action).
create policy "payments: coach full access" on payments
  for select using (is_team_coach(team_id));

create policy "payments: parent read own athlete" on payments
  for select using (
    exists (
      select 1 from athletes a
      where a.id = payments.athlete_id and a.parent_user_id = auth.uid()
    )
  );

create policy "payments: coach insert" on payments
  for insert with check (is_team_coach(team_id));

create policy "payments: coach update" on payments
  for update using (is_team_coach(team_id));

create policy "payments: coach delete" on payments
  for delete using (is_team_coach(team_id));

-- payment_installments: coach records/views/removes entries for their team;
-- a parent can view (read-only) their own athlete's payment history.
create policy "payment_installments: coach can view" on payment_installments
  for select using (
    exists (
      select 1 from payments p
      where p.id = payment_installments.payment_id and is_team_coach(p.team_id)
    )
  );

create policy "payment_installments: parent can view own athlete" on payment_installments
  for select using (
    exists (
      select 1 from payments p
      join athletes a on a.id = p.athlete_id
      where p.id = payment_installments.payment_id and a.parent_user_id = auth.uid()
    )
  );

create policy "payment_installments: coach can insert" on payment_installments
  for insert with check (
    exists (
      select 1 from payments p
      where p.id = payment_installments.payment_id and is_team_coach(p.team_id)
    )
  );

create policy "payment_installments: coach can delete" on payment_installments
  for delete using (
    exists (
      select 1 from payments p
      where p.id = payment_installments.payment_id and is_team_coach(p.team_id)
    )
  );

-- coaches: viewable by any team member (About the Coaches page), editable
-- only by coaches.
create policy "coaches: members can view" on coaches
  for select using (is_team_member(team_id));

create policy "coaches: coach can insert" on coaches
  for insert with check (is_team_coach(team_id));

create policy "coaches: coach can update" on coaches
  for update using (is_team_coach(team_id));

create policy "coaches: coach can delete" on coaches
  for delete using (is_team_coach(team_id));

-- events: viewable by any team member, editable only by coaches.
create policy "events: members can view" on events
  for select using (is_team_member(team_id));

create policy "events: coach can insert" on events
  for insert with check (is_team_coach(team_id));

create policy "events: coach can update" on events
  for update using (is_team_coach(team_id));

create policy "events: coach can delete" on events
  for delete using (is_team_coach(team_id));

-- event_signups: viewable by any member of the event's team. A parent can
-- sign up / cancel their own athlete; a coach can manage any signup on
-- their team's events (e.g. private lesson slots).
create policy "event_signups: members can view" on event_signups
  for select using (
    exists (
      select 1 from events e
      where e.id = event_signups.event_id and is_team_member(e.team_id)
    )
  );

create policy "event_signups: parent or coach can insert" on event_signups
  for insert with check (
    exists (
      select 1 from athletes a
      where a.id = event_signups.athlete_id and a.parent_user_id = auth.uid()
    )
    or exists (
      select 1 from events e
      where e.id = event_signups.event_id and is_team_coach(e.team_id)
    )
  );

create policy "event_signups: parent or coach can delete" on event_signups
  for delete using (
    exists (
      select 1 from athletes a
      where a.id = event_signups.athlete_id and a.parent_user_id = auth.uid()
    )
    or exists (
      select 1 from events e
      where e.id = event_signups.event_id and is_team_coach(e.team_id)
    )
  );

-- private_lesson_payments: coach only, no parent policy at all -- a
-- parent's query returns zero rows here regardless of what columns they ask
-- for, enforced at the database level rather than just hidden in the UI.
create policy "private_lesson_payments: coach can view" on private_lesson_payments
  for select using (
    exists (
      select 1 from event_signups es
      join events e on e.id = es.event_id
      where es.id = private_lesson_payments.event_signup_id and is_team_coach(e.team_id)
    )
  );

create policy "private_lesson_payments: coach can insert" on private_lesson_payments
  for insert with check (
    exists (
      select 1 from event_signups es
      join events e on e.id = es.event_id
      where es.id = private_lesson_payments.event_signup_id and is_team_coach(e.team_id)
    )
  );

create policy "private_lesson_payments: coach can update" on private_lesson_payments
  for update using (
    exists (
      select 1 from event_signups es
      join events e on e.id = es.event_id
      where es.id = private_lesson_payments.event_signup_id and is_team_coach(e.team_id)
    )
  );

-- swag_items: viewable by any team member, editable only by coaches.
create policy "swag_items: members can view" on swag_items
  for select using (is_team_member(team_id));

create policy "swag_items: coach can insert" on swag_items
  for insert with check (is_team_coach(team_id));

create policy "swag_items: coach can update" on swag_items
  for update using (is_team_coach(team_id));

create policy "swag_items: coach can delete" on swag_items
  for delete using (is_team_coach(team_id));

-- swag_votes: any team member can view vote counts and cast/change/retract
-- their own vote (one row per user per item; up/down is an update, not a
-- second row -- see unique(item_id, user_id) above).
create policy "swag_votes: members can view" on swag_votes
  for select using (
    exists (
      select 1 from swag_items si
      where si.id = swag_votes.item_id and is_team_member(si.team_id)
    )
  );

create policy "swag_votes: member can cast own vote" on swag_votes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from swag_items si
      where si.id = swag_votes.item_id and is_team_member(si.team_id)
    )
  );

create policy "swag_votes: member can change own vote" on swag_votes
  for update using (user_id = auth.uid());

create policy "swag_votes: member can retract own vote" on swag_votes
  for delete using (user_id = auth.uid());

-- push_tokens: strictly private to the owning user.
create policy "push_tokens: own read" on push_tokens
  for select using (user_id = auth.uid());

create policy "push_tokens: own insert" on push_tokens
  for insert with check (user_id = auth.uid());

create policy "push_tokens: own update" on push_tokens
  for update using (user_id = auth.uid());

create policy "push_tokens: own delete" on push_tokens
  for delete using (user_id = auth.uid());

-- lesson_requests: coaches see/resolve every request for their team; a
-- parent sees/manages only their own, and can only retract while pending.
create policy "lesson_requests: coach can view" on lesson_requests
  for select using (is_team_coach(team_id));

create policy "lesson_requests: coach can update" on lesson_requests
  for update using (is_team_coach(team_id));

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

create policy "lesson_requests: requester can cancel pending" on lesson_requests
  for delete using (requested_by = auth.uid() and status = 'pending');

create policy "lesson_requests: coach can delete" on lesson_requests
  for delete using (is_team_coach(team_id));

-- ---------------------------------------------------------------------------
-- Realtime (for live SWAG vote counts and live calendar/roster updates)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table swag_votes;
alter publication supabase_realtime add table swag_items;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table event_signups;
alter publication supabase_realtime add table private_lesson_payments;
alter publication supabase_realtime add table lesson_requests;

-- ---------------------------------------------------------------------------
-- Backfill (no-op on a fresh install with no existing payments)
-- ---------------------------------------------------------------------------
-- Existing payments already marked 'paid' get one installment for the full
-- amount, dated when the payment record was created, so they keep showing
-- 100% once the ring switches to ledger-based math.
insert into payment_installments (payment_id, amount_cents, paid_at, recorded_by, created_at)
select id, amount_cents, created_at::date, created_by, created_at
from payments
where status = 'paid';
