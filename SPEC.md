```markdown
# Spécifications Techniques - AKWÈ

## 1. Schéma de Base de données (Supabase / PostgreSQL)[cite: 1]
```sql
create table users (
    id uuid primary key default gen_random_uuid(),
    phone text unique not null,
    full_name text not null,
    pin_hash text not null,
    lang text default 'fr', -- 'fr' | 'fon' | 'yo'
    created_at timestamptz default now()
);

create table groups (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    owner_id uuid references users(id) on delete cascade,
    contribution_amount integer not null, -- en FCFA
    frequency text not null, -- 'daily' | 'weekly' | 'monthly'
    created_at timestamptz default now()
);

create table members (
    id uuid primary key default gen_random_uuid(),
    group_id uuid references groups (id) on delete cascade,
    full_name text not null,
    phone text,
    joined_at timestamptz default now()
);

create table transactions (
    id uuid primary key default gen_random_uuid(),
    group_id uuid references groups (id) on delete cascade,
    member_id uuid references members(id) on delete set null,
    amount integer not null, -- FCFA, entier JAMAIS de float
    type text not null, -- 'contribution' | 'payout' | 'loan'
    source text default 'manual', -- 'manual' | 'voice'
    occurred_at timestamptz default now(),
    client_uuid text unique, -- idempotence pour la sync offline
    synced_at timestamptz
);
