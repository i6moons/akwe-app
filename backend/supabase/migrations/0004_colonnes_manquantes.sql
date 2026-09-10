-- AKWÈ — aligne une base créée avant `0001_init.sql`.
--
-- Le projet hébergé a été monté à partir d'un schéma plus court : `groups` y
-- ignore le quartier et l'état d'activité, `transactions` la méthode de
-- paiement et la phrase dictée. `0001_init.sql` crée les tables avec
-- `if not exists` et ne pouvait donc rien y ajouter : rejouer les migrations
-- laissait la base exactement dans le même état, et la synchronisation
-- échouait sur « Could not find the 'is_active' column ».
--
-- Chaque ajout est conditionnel : la migration peut être rejouée sans risque,
-- et une base déjà conforme n'est pas modifiée.

alter table groups add column if not exists location   text;
alter table groups add column if not exists currency   text not null default 'XOF';
alter table groups add column if not exists is_active  boolean not null default true;

alter table members add column if not exists is_active boolean not null default true;

alter table transactions add column if not exists method         text not null default 'cash';
alter table transactions add column if not exists raw_transcript text;
alter table transactions add column if not exists confidence     numeric;
alter table transactions add column if not exists created_by     uuid references users (id);
alter table transactions add column if not exists created_at     timestamptz not null default now();

-- Les contraintes ne sont posées qu'une fois les colonnes présentes. `do` permet
-- de les ignorer si elles existent déjà, `add constraint` n'ayant pas de
-- variante « if not exists ».
-- La contrainte déployée n'admettait que trois types d'opérations. L'analyse
-- vocale reconnaît pourtant « a remboursé » et « frais » : ces saisies étaient
-- refusées par la base, et comme un lot est écrit d'un bloc, une seule d'entre
-- elles suffisait à faire échouer toute la synchronisation.
alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('contribution', 'payout', 'loan', 'repayment', 'fee'));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_method_check') then
    alter table transactions add constraint transactions_method_check
      check (method in ('cash', 'momo', 'moov', 'celtiis', 'card'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'transactions_confidence_check') then
    alter table transactions add constraint transactions_confidence_check
      check (confidence is null or confidence between 0 and 1);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'groups_frequency_check') then
    alter table groups add constraint groups_frequency_check
      check (frequency in ('daily', 'weekly', 'monthly'));
  end if;
end $$;

-- La colonne est héritée du temps où le code secret était vérifié par nos soins.
-- Supabase Auth en a désormais la charge : l'exiger obligerait à y écrire une
-- valeur factice à chaque inscription.
alter table users alter column pin_hash drop not null;

create index if not exists transactions_group_date_idx on transactions (group_id, occurred_at desc);
create index if not exists members_group_idx on members (group_id);
