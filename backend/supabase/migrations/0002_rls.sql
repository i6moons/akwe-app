-- AKWÈ — cloisonnement par groupe (Row Level Security).
-- Une trésorière ne voit que les caisses qu'elle possède. Rien ne fuit d'un
-- groupe à l'autre, même si un identifiant est deviné.
--
-- Idempotente. Le projet hébergé a déjà reçu ces politiques (souvent sous les
-- noms « _by_caisse » de schema.sql). Un second `CREATE POLICY` sans DROP
-- échoue : « policy "users_self" for table "users" already exists ».

alter table users         enable row level security;
alter table groups        enable row level security;
alter table members       enable row level security;
alter table transactions  enable row level security;
alter table credit_scores enable row level security;

drop policy if exists users_self on users;
create policy users_self on users
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists groups_owner on groups;
create policy groups_owner on groups
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists members_by_group on members;
drop policy if exists members_by_caisse on members;
create policy members_by_caisse on members
  for all using (
    group_id in (select id from groups where owner_id = auth.uid())
  ) with check (
    group_id in (select id from groups where owner_id = auth.uid())
  );

drop policy if exists transactions_by_group on transactions;
drop policy if exists transactions_by_caisse on transactions;
create policy transactions_by_caisse on transactions
  for all using (
    group_id in (select id from groups where owner_id = auth.uid())
  ) with check (
    group_id in (select id from groups where owner_id = auth.uid())
  );

drop policy if exists scores_by_group on credit_scores;
drop policy if exists credit_scores_by_caisse on credit_scores;
create policy credit_scores_by_caisse on credit_scores
  for all using (
    member_id in (
      select m.id from members m
      join groups g on g.id = m.group_id
      where g.owner_id = auth.uid()
    )
  ) with check (
    member_id in (
      select m.id from members m
      join groups g on g.id = m.group_id
      where g.owner_id = auth.uid()
    )
  );

-- `receipts` n'est pas créée par 0001 ; elle existe sur le projet hébergé.
do $$
begin
  if to_regclass('public.receipts') is not null then
    execute 'alter table receipts enable row level security';
    execute 'drop policy if exists receipts_by_caisse on receipts';
    execute $p$
      create policy receipts_by_caisse on receipts
        for all using (
          transaction_id in (
            select t.id from transactions t
            join groups g on g.id = t.group_id
            where g.owner_id = auth.uid()
          )
        ) with check (
          transaction_id in (
            select t.id from transactions t
            join groups g on g.id = t.group_id
            where g.owner_id = auth.uid()
          )
        )
    $p$;
  end if;
end $$;
