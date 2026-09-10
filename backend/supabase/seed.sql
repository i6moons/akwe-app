-- AKWÈ — données de démonstration (Tontine Ayaba, Godomey)
-- À exécuter sur une base vide, après 0001_init.sql, en SQL Editor (rôle postgres).
--
-- Commune : Godomey (pas de colonne location dans le schéma — noté ici).
--
-- Solde attendu de la caisse = somme algébrique des opérations
--   contribution  → +
--   loan / payout → −
--
--   + 93 cotisations × 2 000 F              = 186 000 F
--     (12 membres × 8 semaines = 96 échéances
--      − Kossi : semaines 3 et 6
--      − Yaovi : semaine 5)
--   + 1 remboursement partiel × 8 000 F     =   8 000 F
--     (type contribution : le schéma n'autorise pas « repayment »)
--   − 1 prêt × 20 000 F                     =  20 000 F
--   ----------------------------------------------------
--   solde attendu = 174 000 F
--
-- Vérification :
--   select coalesce(sum(case
--     when type = 'contribution' then amount
--     else -amount end), 0) from transactions;
--   -- → 174000

insert into users (id, phone, full_name, pin_hash, lang) values
  (
    'a0000000-0000-4000-8000-000000000001',
    '+2290190000004',
    'Adjoavi Hounkpatin',
    'seed-pin-hash',
    'fr'
  );

insert into groups (id, name, owner_id, contribution_amount, frequency) values
  (
    'a0000000-0000-4000-8000-000000000010',
    'Tontine Ayaba',
    'a0000000-0000-4000-8000-000000000001',
    2000,
    'weekly'
  );

insert into members (id, group_id, full_name, phone, joined_at) values
  ('a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000010', 'Adjovi Sébastien',    '+2290190000001', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000010', 'Akoba Djimon',        '+2290190000002', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000010', 'Fifadè Mensah',       '+2290190000003', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000010', 'Kokou Amoussou',      '+2290190000006', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000010', 'Adjoavi Hounkpatin',  '+2290190000004', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000010', 'Kossi Agbodjan',      '+2290190000005', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000107', 'a0000000-0000-4000-8000-000000000010', 'Afiavi Dossou',       '+2290190000007', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000108', 'a0000000-0000-4000-8000-000000000010', 'Bernadette Gbaguidi', '+2290190000008', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000109', 'a0000000-0000-4000-8000-000000000010', 'Rachidatou Alassane', '+2290190000009', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000110', 'a0000000-0000-4000-8000-000000000010', 'Mahougnon Sossou',    '+2290190000010', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000111', 'a0000000-0000-4000-8000-000000000010', 'Chantal Ahouandjinou','+2290190000011', now() - interval '59 days'),
  ('a0000000-0000-4000-8000-000000000112', 'a0000000-0000-4000-8000-000000000010', 'Yaovi Zinsou',        '+2290190000012', now() - interval '59 days');

-- 8 semaines × 12 membres, moins 3 absences (Kossi s3+s6, Yaovi s5).
insert into transactions (
  group_id, member_id, amount, type, source, occurred_at, client_uuid, synced_at
)
select
  'a0000000-0000-4000-8000-000000000010',
  m.id,
  2000,
  'contribution',
  case when m.full_name in ('Adjoavi Hounkpatin', 'Kossi Agbodjan') then 'voice' else 'manual' end,
  now() - ((9 - w.week) * interval '7 days') + interval '9 hours',
  'seed-ayaba-' || replace(m.full_name, ' ', '-') || '-s' || w.week::text,
  now() - ((9 - w.week) * interval '7 days') + interval '10 hours'
from members m
cross join generate_series(1, 8) as w(week)
where m.group_id = 'a0000000-0000-4000-8000-000000000010'
  and not (
    (m.full_name = 'Kossi Agbodjan' and w.week in (3, 6))
    or (m.full_name = 'Yaovi Zinsou' and w.week = 5)
  );

-- Prêt à Akoba Djimon, puis remboursement partiel (8 000 / 20 000).
insert into transactions (
  group_id, member_id, amount, type, source, occurred_at, client_uuid, synced_at
) values
  (
    'a0000000-0000-4000-8000-000000000010',
    'a0000000-0000-4000-8000-000000000102',
    20000,
    'loan',
    'manual',
    now() - interval '21 days',
    'seed-ayaba-akoba-pret',
    now() - interval '21 days' + interval '1 hour'
  ),
  (
    'a0000000-0000-4000-8000-000000000010',
    'a0000000-0000-4000-8000-000000000102',
    8000,
    'contribution',
    'manual',
    now() - interval '7 days',
    'seed-ayaba-akoba-remboursement-partiel',
    now() - interval '7 days' + interval '1 hour'
  );
