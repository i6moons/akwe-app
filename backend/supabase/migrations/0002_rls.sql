-- AKWÈ — cloisonnement par groupe (Row Level Security).
-- Une trésorière ne voit que les caisses qu'elle possède. Rien ne fuit d'un
-- groupe à l'autre, même si un identifiant est deviné.
--
-- NE PAS appliquer ce fichier après 0001_init.sql : le RLS et les politiques
-- y sont déjà. Relancer 0002 provoque « policy already exists ».

alter table users         enable row level security;
alter table groups        enable row level security;
alter table members       enable row level security;
alter table transactions  enable row level security;
alter table credit_scores enable row level security;

-- Chacune ne lit et ne modifie que sa propre fiche.
create policy users_self on users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy groups_owner on groups
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy members_by_group on members
  for all using (
    group_id in (select id from groups where owner_id = auth.uid())
  ) with check (
    group_id in (select id from groups where owner_id = auth.uid())
  );

create policy transactions_by_group on transactions
  for all using (
    group_id in (select id from groups where owner_id = auth.uid())
  ) with check (
    group_id in (select id from groups where owner_id = auth.uid())
  );

create policy scores_by_group on credit_scores
  for select using (
    member_id in (
      select m.id from members m
      join groups g on g.id = m.group_id
      where g.owner_id = auth.uid()
    )
  );
