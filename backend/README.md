# AKWÈ — Backend

Responsable : **AMINOU Malick** (lead technique).
Base de données, API, synchronisation serveur et IA vocale.

> Le frontend ne fait **aucun** appel réseau direct depuis un composant. Il écrit
> dans IndexedDB puis pousse une file d'attente vers `POST /api/sync`. Le contrat
> exact est dans [`contracts/api.ts`](./contracts/api.ts) — c'est la source de
> vérité partagée entre les deux dossiers.

## Contenu

| Chemin | Rôle |
| --- | --- |
| `supabase/migrations/` | Schéma SQL et politiques RLS |
| `contracts/api.ts` | Types requête / réponse |
| `src/sync/normalize.ts` | Lecture et validation d'une entrée de la file |
| `src/sync/process-batch.ts` | Écriture idempotente (`client_uuid`), Supabase ou mémoire |
| `src/voice/french-numbers.ts` | Montants dictés (« quatre-vingt-dix mille ») |
| `src/voice/parse.ts` | Type d'opération, membre, date, confiance |
| `src/voice/llm.ts` | Modèle distant optionnel (Groq), réponse revalidée |
| `src/receipts/` | WhatsApp / SMS (mock si pas de jeton) |
| `src/handlers.ts` | Validation des requêtes, sans dépendance au transport |
| `src/server.ts` | Serveur HTTP autonome (port 3460) |
| `../frontend/app/api/*` | Routes Next **indépendantes** — même contrat, autre code |

Les routes Next du frontend n'importent pas ce dossier : Vercel déploie
`frontend/` comme racine. Les deux implémentations se rejoignent sur
`contracts/api.ts`, et toute règle métier changée ici doit l'être des deux
côtés.

## Mise en route

```bash
cd backend
cp .env.example .env.local
npm install
npm run test
npm run dev          # http://127.0.0.1:3460
```

Sans `SUPABASE_*`, le serveur utilise une **mémoire locale** (idempotente) pour
la démo. Branchez Supabase quand les clés sont prêtes — aucune autre mesure.

Projet hébergé : [cnwrgnpsvwxpeuyijbeu](https://supabase.com/dashboard/project/cnwrgnpsvwxpeuyijbeu)
(`https://cnwrgnpsvwxpeuyijbeu.supabase.co`).

MCP Cursor : [`.cursor/mcp.json`](../.cursor/mcp.json) (lecture seule, scoped
à ce projet). Dans Cursor : **Settings → Tools & MCP → supabase → Enable**,
puis **Login**.

SQL Editor (rôle postgres), dans l'ordre :

1. `0001_init.sql` — schéma
2. `0002_rls.sql` — politiques RLS
3. `0003_profils.sql` — raccord entre Supabase Auth et `public.users`
4. `0004_colonnes_manquantes.sql` — colonnes et contraintes d'une base montée avant `0001`
5. `0005_owner_id_obligatoire.sql` — `groups.owner_id` non nul

**Toutes sont rejouables** : les relancer sur une base déjà conforme ne la modifie
pas. Le job CI `sql` les applique dans cet ordre sur un PostgreSQL 16 neuf à
chaque poussée, ce qui est la seule garantie qu'elles décrivent bien la base.

`supabase/seed.sql` est **optionnel** : il crée la Tontine Ayaba de démonstration
(caisse `a0000000-…-0010`, sept membres, solde 174 000 F). Ne l'appliquez pas sur
une base qui porte déjà de vraies caisses — il y mêlerait des données fictives.

### État du projet hébergé

Au 10 septembre 2026, il porte de **vraies données d'usage**, créées depuis
l'application, et non le seed :

| Caisse | Membres | Opérations | Solde |
| --- | --- | --- | --- |
| Tontine du marché | 1 | 0 | 0 F |
| Ifah | 2 | 1 | 1 000 F |
| Tontine Ayaba | 1 | 2 | 12 000 F |
| Hello | 0 | 0 | 0 F |
| **total** | **4** | **3** | **13 000 F** |

Le seed n'y a jamais été appliqué : la caisse `a0000000-…-0010` qu'il crée est
absente, et la « Tontine Ayaba » ci-dessus porte un autre identifiant. Ce README
annonçait pourtant un solde de 174 000 F et donnait la requête ci-dessous comme
vérification d'installation : elle ne vaut que sur une base fraîchement seedée, et
échouait sur le projet hébergé.

```sql
-- Sur une base fraîchement seedée uniquement.
select coalesce(sum(case
  when type = 'contribution' then amount
  else -amount end), 0) as solde
from transactions;
-- → 174000
```

## Endpoints

| Méthode | Chemin | Effet |
| --- | --- |
| `POST` | `/api/sync` | Remonte la file hors ligne, renvoie `confirmed[]` |
| `POST` | `/api/voice/parse` | Structure une phrase dictée en JSON |
| `POST` | `/api/receipts` | Envoie le reçu WhatsApp / SMS |
| `GET`/`HEAD` | `/api/health` | Sonde + mode `supabase` \| `memory` |

Côté frontend : laisser `NEXT_PUBLIC_API_URL` vide (même origine via les routes
Next) **ou** pointer vers `http://127.0.0.1:3460` pour le serveur autonome.

## Points d'attention

- **Montants = entiers FCFA.** Refus des floats, et refus au-delà de
  2 147 483 647 (capacité de la colonne `integer`).
- **`client_uuid` unique** → rejeu de file sans doublon. Les tables `groups` et
  `members` n'ayant pas cette colonne, le `client_uuid` y sert d'identifiant :
  il doit donc être un UUID, comme le produit `crypto.randomUUID()`.
- **Ordre d'écriture** : caisses, puis membres, puis opérations — sinon la clé
  étrangère refuse une cotisation arrivée avant sa caisse.
- **Lot plafonné à 200 opérations**, corps de requête à 1 Mio.
- **Types d'opération** contrôlés contre la contrainte `check` avant l'envoi en
  base : une valeur hors liste est rejetée avec une phrase lisible.
- **RLS** : une trésorière ne voit que ses caisses.
- **Une caisse a toujours une propriétaire.** Toutes les politiques RLS passent par
  `groups.owner_id` : une caisse sans propriétaire serait invisible de tous, même
  de celle qui l'a créée. La base la refuse donc à l'écriture (`0005`).
- **Voix** : jamais inventer un montant ; `amount: null` si doute. La réponse du
  modèle distant est revalidée, nom du membre compris.

## Tests

`npm run verify` enchaîne `tsc --noEmit` puis les tests. Les cas couverts
tiennent aux erreurs déjà rencontrées : rejeu d'un lot, entrée illisible,
montant décimal, phrase sans mot-clé, réponse aberrante du modèle.
