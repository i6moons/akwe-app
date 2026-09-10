-- AKWÈ — raccord entre l'authentification Supabase et la table des trésorières.
--
-- Les politiques de `0002_rls.sql` comparent `users.id` à `auth.uid()`. Or
-- `auth.uid()` désigne une ligne de `auth.users`, table gérée par Supabase, sans
-- aucun lien avec `public.users`. Tant que les deux ne portent pas le même
-- identifiant, aucune politique ne peut être satisfaite : la base refuse alors
-- toute écriture, y compris à la propriétaire légitime. Le cloisonnement
-- semblait en place, il bloquait tout.

-- Le secret de connexion est désormais tenu par Supabase Auth. Garder
-- `pin_hash` obligatoire imposerait d'y écrire une valeur factice à chaque
-- inscription, ce qui ferait croire à un code défini alors qu'il n'en existe pas.
alter table users alter column pin_hash drop not null;

/**
 * Crée la fiche de la trésorière au moment de son inscription.
 *
 * `security definer` est nécessaire : le déclencheur s'exécute pour le compte de
 * la nouvelle utilisatrice, qui n'a pas encore de fiche et ne passerait donc pas
 * la politique `users_self`.
 */
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone, full_name)
  values (
    new.id,
    -- `phone` est unique et obligatoire : à défaut de numéro, l'identifiant
    -- fait office de valeur distincte plutôt que de faire échouer l'inscription.
    coalesce(new.phone, new.email, new.id::text),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Trésorière')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists creer_profil_apres_inscription on auth.users;
create trigger creer_profil_apres_inscription
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Les comptes déjà créés avant cette migration n'ont pas de fiche.
insert into public.users (id, phone, full_name)
select
  u.id,
  coalesce(u.phone, u.email, u.id::text),
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Trésorière')
from auth.users u
on conflict (id) do nothing;
