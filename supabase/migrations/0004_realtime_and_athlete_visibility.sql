-- (1) Enables Supabase Realtime on the tables the calendar depends on, so
-- one person's add/cancel/approve is pushed to every other signed-in client
-- instead of requiring a manual refresh. Guarded with a pg_publication_tables
-- check since "alter publication ... add table" has no IF NOT EXISTS form
-- and errors on a second run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_signups'
  ) then
    alter publication supabase_realtime add table event_signups;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'private_lesson_payments'
  ) then
    alter publication supabase_realtime add table private_lesson_payments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lesson_requests'
  ) then
    alter publication supabase_realtime add table lesson_requests;
  end if;
end $$;

-- (2) Widen athlete visibility from "coach, or the athlete's own parent" to
-- "any team member" -- so Team Info can show whose daughter is whose to
-- everyone, not just the coach.
drop policy if exists "athletes: view" on athletes;
create policy "athletes: view" on athletes
  for select using (is_team_member(team_id));

-- (3) By default Postgres only includes primary-key columns in the "old row"
-- image for UPDATE/DELETE. Realtime needs the full old row (specifically
-- team_id) to authorize whether a client is allowed to see that change under
-- RLS -- without this, cancel/decline/delete events are silently dropped
-- instead of reaching other clients (confirmed live: inserts synced fine,
-- deletes didn't, until this was added). Idempotent -- setting the same
-- replica identity twice is a no-op, not an error.
alter table events replica identity full;
alter table event_signups replica identity full;
alter table private_lesson_payments replica identity full;
alter table lesson_requests replica identity full;
alter table swag_votes replica identity full;
alter table swag_items replica identity full;
