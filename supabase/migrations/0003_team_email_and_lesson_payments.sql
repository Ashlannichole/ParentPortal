-- Adds: (1) an email column on team_members so it can be shown in the team
-- directory, and (2) coach-only private-lesson payment tracking. Run this in
-- the Supabase SQL editor alongside the schema/migrations you've already
-- applied.

alter table team_members add column if not exists email text;

-- Re-create create_team/join_team/update_my_contact_info with an added
-- p_email parameter. Drop first since adding a parameter changes the
-- function's signature -- "create or replace" alone would leave the old
-- 2-arg versions around as separate overloads instead of replacing them.
drop function if exists create_team(text, text);
drop function if exists join_team(text, text);
drop function if exists update_my_contact_info(uuid, text, text);

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

-- Coach-only private-lesson payment tracking. This is deliberately its own
-- table rather than a column on event_signups: RLS is row-level, so a
-- `paid` column on event_signups (which parents can already read, for the
-- roster) couldn't be hidden from them without hiding the whole row. A
-- separate table with no parent-facing policy at all enforces "coach only"
-- at the database level, not just in the UI.
create table private_lesson_payments (
  id uuid primary key default gen_random_uuid(),
  event_signup_id uuid not null references event_signups(id) on delete cascade unique,
  paid boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table private_lesson_payments enable row level security;

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
