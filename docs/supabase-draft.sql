-- DRAFT ONLY. The app does not depend on this. Mirrors the local SQLite schema (src/db/migrations.ts).
-- Every table: id uuid pk, created_at, updated_at, deleted_at (tombstone), plus owner_id for RLS.
-- `dirty` is a client-only flag and is not stored server-side.

create extension if not exists "pgcrypto";

create table profiles (id uuid primary key references auth.users on delete cascade, display_name text, upi_id text, created_at timestamptz default now());

create table groups_ (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users,
  name text not null, currency text not null default 'INR', icon text, kind text, simplify boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

create table people (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users,
  name text not null, phone text, upi_id text, remote_user_id uuid references auth.users,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

create table group_members (
  id uuid primary key default gen_random_uuid(), group_id uuid not null references groups_ on delete cascade,
  person_id uuid not null references people, user_id uuid references auth.users,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

create table group_expenses (
  id uuid primary key default gen_random_uuid(), group_id uuid references groups_ on delete cascade,
  description text not null, amount bigint not null check (amount > 0), currency text not null, rate numeric not null default 1,
  category_id text, occurred_at timestamptz not null, split_type text not null, note text, receipt_path text, created_by uuid references people,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

create table expense_payers (id uuid primary key default gen_random_uuid(), expense_id uuid not null references group_expenses on delete cascade, person_id uuid not null references people, amount bigint not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table expense_shares (id uuid primary key default gen_random_uuid(), expense_id uuid not null references group_expenses on delete cascade, person_id uuid not null references people, amount bigint not null, input_value numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table settlements (id uuid primary key default gen_random_uuid(), group_id uuid references groups_, from_person uuid not null references people, to_person uuid not null references people, amount bigint not null check (amount > 0), currency text not null default 'INR', method text, note text, occurred_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table activity (id uuid primary key default gen_random_uuid(), group_id uuid references groups_, actor_id uuid references people, kind text not null, entity_id uuid, summary text not null, payload jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);
create table comments (id uuid primary key default gen_random_uuid(), expense_id uuid not null references group_expenses on delete cascade, person_id uuid references people, body text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz);

-- Personal tracker tables (transactions, accounts, categories, budgets, recurring, merchant_rules) follow the same pattern with owner_id = auth.uid().
-- NEVER sync pending_transactions.raw_hash or any SMS-derived raw text; sync only user-confirmed transactions, and only if the user opts in.

-- RLS: a group is visible to its owner and to users linked through group_members.user_id.
alter table groups_ enable row level security;
alter table group_members enable row level security;
alter table group_expenses enable row level security;
alter table expense_payers enable row level security;
alter table expense_shares enable row level security;
alter table settlements enable row level security;
alter table activity enable row level security;
alter table comments enable row level security;
alter table people enable row level security;

create function is_group_member(gid uuid) returns boolean language sql security definer stable as $$
  select exists (select 1 from groups_ g where g.id = gid and g.owner_id = auth.uid())
      or exists (select 1 from group_members m where m.group_id = gid and m.user_id = auth.uid() and m.deleted_at is null);
$$;

create policy groups_rw on groups_ for all using (is_group_member(id)) with check (owner_id = auth.uid());
create policy members_rw on group_members for all using (is_group_member(group_id)) with check (is_group_member(group_id));
create policy expenses_rw on group_expenses for all using (group_id is null and created_by in (select id from people where owner_id = auth.uid()) or is_group_member(group_id)) with check (true);
create policy payers_rw on expense_payers for all using (exists (select 1 from group_expenses e where e.id = expense_id and (is_group_member(e.group_id) or e.group_id is null))) with check (true);
create policy shares_rw on expense_shares for all using (exists (select 1 from group_expenses e where e.id = expense_id and (is_group_member(e.group_id) or e.group_id is null))) with check (true);
create policy settlements_rw on settlements for all using (is_group_member(group_id) or group_id is null) with check (true);
create policy activity_rw on activity for all using (is_group_member(group_id)) with check (is_group_member(group_id));
create policy comments_rw on comments for all using (exists (select 1 from group_expenses e where e.id = expense_id and is_group_member(e.group_id))) with check (true);
create policy people_rw on people for all using (owner_id = auth.uid() or remote_user_id = auth.uid()) with check (owner_id = auth.uid());

-- Invites: a short-lived code that maps to a group; redeeming it inserts a group_members row for auth.uid().
create table group_invites (code text primary key, group_id uuid not null references groups_ on delete cascade, expires_at timestamptz not null, created_by uuid not null references auth.users);
