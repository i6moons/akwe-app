-- AKWÈ — schéma courant (miroir de migrations/0001_init.sql)
--
-- La table s'appelle `groups` par convention technique, mais à l'écran
-- cette entité s'appelle TOUJOURS une « caisse ».
--
-- Montants : type integer (FCFA). Jamais numeric, jamais real.
-- Pas de colonne « solde » : les soldes sont calculés à la lecture.

create extension if not exists "pgcrypto";

create table users (
  id          uuid primary key default gen_random_uuid(),
  phone       text unique not null,
  full_name   text not null,
  pin_hash    text not null,
  lang        text not null default 'fr' check (lang in ('fr', 'fon', 'yo')),
  created_at  timestamptz not null default now()
);

create table groups (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  owner_id              uuid not null references users (id) on delete cascade,
  contribution_amount   integer not null check (contribution_amount > 0),
  frequency             text not null check (frequency in ('daily', 'weekly', 'monthly')),
  created_at            timestamptz not null default now()
);

create table members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups (id) on delete cascade,
  full_name  text not null,
  phone      text,
  joined_at  timestamptz not null default now()
);

create table transactions (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups (id) on delete cascade,
  member_id    uuid references members (id) on delete set null,
  amount       integer not null check (amount > 0),
  type         text not null check (type in ('contribution', 'payout', 'loan')),
  source       text not null default 'manual' check (source in ('manual', 'voice')),
  occurred_at  timestamptz not null default now(),
  -- Clé d'idempotence de la sync hors ligne : un rejeu ne crée pas de doublon.
  client_uuid  text unique not null,
  synced_at    timestamptz
);

create table receipts (
  id                    uuid primary key default gen_random_uuid(),
  transaction_id        uuid not null references transactions (id) on delete cascade,
  member_phone          text not null,
  channel               text not null check (channel in ('whatsapp', 'sms')),
  sent                  boolean not null default false,
  provider_message_id   text,
  created_at            timestamptz not null default now()
);

create table credit_scores (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references members (id) on delete cascade,
  score             integer not null check (score between 0 and 100),
  regularity        integer not null check (regularity between 0 and 100),
  seniority_months  integer not null default 0,
  total_saved       integer not null default 0 check (total_saved >= 0),
  repayment_rate    integer not null check (repayment_rate between 0 and 100),
  computed_at       timestamptz not null default now()
);

create index transactions_group_occurred_at_idx
  on transactions (group_id, occurred_at desc);

create index transactions_member_id_idx
  on transactions (member_id);

create index transactions_client_uuid_idx
  on transactions (client_uuid);

-- RLS : une trésorière n'accède qu'à ses caisses, et aux lignes rattachées.
alter table users         enable row level dsecurity;
alter table groups        enable row level security;
alter table members       enable row level security;
alter table transactions  enable row level security;
alter table receipts      enable row level security;
alter table credit_scores enable row level security;

create policy users_self on users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy groups_owner on groups
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy members_by_caisse on members
  for all
  using (
    group_id in (select id from groups where owner_id = auth.uid())
  )
  with check (
    group_id in (select id from groups where owner_id = auth.uid())
  );

create policy transactions_by_caisse on transactions
  for all
  using (
    group_id in (select id from groups where owner_id = auth.uid())
  )
  with check (
    group_id in (select id from groups where owner_id = auth.uid())
  );

create policy receipts_by_caisse on receipts
  for all
  using (
    transaction_id in (
      select t.id
      from transactions t
      join groups g on g.id = t.group_id
      where g.owner_id = auth.uid()
    )
  )
  with check (
    transaction_id in (
      select t.id
      from transactions t
      join groups g on g.id = t.group_id
      where g.owner_id = auth.uid()
    )
  );

create policy credit_scores_by_caisse on credit_scores
  for all
  using (
    member_id in (
      select m.id
      from members m
      join groups g on g.id = m.group_id
      where g.owner_id = auth.uid()
    )
  )
  with check (
    member_id in (
      select m.id
      from members m
      join groups g on g.id = m.group_id
      where g.owner_id = auth.uid()
    )
  );
