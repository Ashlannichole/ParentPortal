-- Adds a payment history ledger so coaches can record partial payments
-- against a due item (club dues payment plans) instead of a single
-- paid/unpaid toggle. Run this in the Supabase SQL editor -- it only adds
-- new objects and backfills history for existing "paid" rows, so it's safe
-- to run alongside what you already have.

create table payment_installments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount_cents integer not null,
  paid_at date not null default current_date,
  recorded_by uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

alter table payment_installments enable row level security;

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

-- Backfill: existing payments already marked 'paid' get one installment for
-- the full amount, dated when the payment record was created, so they keep
-- showing 100% once the ring switches to ledger-based math.
insert into payment_installments (payment_id, amount_cents, paid_at, recorded_by, created_at)
select id, amount_cents, created_at::date, created_by, created_at
from payments
where status = 'paid';
