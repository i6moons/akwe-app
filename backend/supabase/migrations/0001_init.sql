-- AKWÈ — schéma initial
-- Règle absolue : les montants sont des ENTIERS en FCFA. Jamais de type flottant
-- pour de l'argent, jamais de `numeric` sur un montant.

create extension if not exists "pgcrypto";

-- Trésorières et membres disposant d'un compte.
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  phone       text unique not null,
  full_name   text not null,
  pin_hash    text not null,
  lang        text not null default 'fr' check (lang in ('fr', 'fon', 'yo')),
  created_at  timestamptz not null default now()
);

-- La tontine ou la coopérative.
create table if not exists groups (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  owner_id            uuid references users (id) on delete cascade,
  contribution_amount integer not null check (contribution_amount > 0),
  frequency           text not null check (frequency in ('daily', 'weekly', 'monthly')),
  location            text,
  currency            text not null default 'XOF',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups (id) on delete cascade,
  full_name  text not null,
  phone      text,
  joined_at  timestamptz not null default now(),
  is_active  boolean not null default true
);

create table if not exists transactions (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups (id) on delete cascade,
  member_id      uuid references members (id) on delete set null,
  amount         integer not null check (amount > 0),
  type           text not null check (type in ('contribution', 'payout', 'loan', 'repayment', 'fee')),
  method         text not null default 'cash' check (method in ('cash', 'momo', 'moov', 'celtiis', 'card')),
  source         text not null default 'manual' check (source in ('manual', 'voice', 'payment_webhook')),
  raw_transcript text,
  confidence     numeric check (confidence between 0 and 1),
  occurred_at    timestamptz not null default now(),
  -- Clé d'idempotence de la synchronisation hors ligne : l'unicité garantit
  -- qu'un rejeu de la file d'attente ne crée jamais de doublon.
  client_uuid    text unique not null,
  synced_at      timestamptz,
  created_by     uuid references users (id),
  created_at     timestamptz not null default now()
);

create index if not exists transactions_group_date_idx on transactions (group_id, occurred_at desc);
create index if not exists transactions_member_idx on transactions (member_id);
create index if not exists members_group_idx on members (group_id);

create table if not exists credit_scores (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references members (id) on delete cascade,
  score             integer not null check (score between 0 and 100),
  regularity        integer not null check (regularity between 0 and 100),
  seniority_months  integer not null default 0,
  total_saved       integer not null default 0,
  repayment_rate    integer not null check (repayment_rate between 0 and 100),
  computed_at       timestamptz not null default now()
);

create index if not exists credit_scores_member_idx on credit_scores (member_id, computed_at desc);
