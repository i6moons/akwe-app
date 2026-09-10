-- AKWÈ — une caisse a toujours une propriétaire.
--
-- `0001_init.sql` déclare `groups.owner_id` simplement « references users (id) »,
-- donc nullable, alors que la base hébergée le porte en `not null`. La
-- divergence a été constatée en rejouant un lot de synchronisation contre le
-- projet hébergé : la caisse était refusée par
--
--   null value in column "owner_id" of relation "groups"
--     violates not-null constraint
--
-- message que les migrations ne laissaient pas prévoir.
--
-- C'est la base qui a raison, et le schéma versionné qui doit s'aligner. Toutes
-- les politiques de `0002_rls.sql` s'appuient sur `owner_id` — directement pour
-- `groups`, par sous-requête pour `members`, `transactions`, `credit_scores` et
-- `receipts`. Une caisse dont `owner_id` serait nul ne satisferait donc aucune
-- politique : invisible à toutes les trésorières, y compris à celle qui l'a
-- créée, et impossible à réparer depuis l'application. Mieux vaut la refuser à
-- l'écriture que la découvrir orpheline.
--
-- Migration rejouable : `set not null` sur une colonne qui l'est déjà ne fait
-- rien.

-- Aucune valeur de repli n'existe pour un propriétaire : inventer un rattachement
-- donnerait la caisse d'une trésorière à une autre. La migration s'arrête donc,
-- en disant quoi regarder, plutôt que d'échouer sur un message d'ALTER TABLE.
do $$
declare
  orphelines integer;
begin
  select count(*) into orphelines from groups where owner_id is null;
  if orphelines > 0 then
    raise exception 'AKWÈ : % caisse(s) sans propriétaire. Rattachez-les avant de rejouer cette migration (select id, name from groups where owner_id is null).', orphelines;
  end if;
end $$;

alter table groups alter column owner_id set not null;
