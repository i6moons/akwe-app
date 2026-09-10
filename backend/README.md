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

SQL Editor (rôle postgres), dans l'ordre, **une seule fois** :

1. `supabase/migrations/0001_init.sql` — schéma
2. `supabase/migrations/0002_rls.sql` — politiques RLS (rejouable : DROP IF EXISTS)
3. `supabase/seed.sql` — Tontine Ayaba, solde attendu **174 000 F**

Le projet hébergé a déjà reçu le schéma + le seed. Relancer `0002` est sans
danger : les politiques existantes sont remplacées, pas dupliquées.

Vérification après le seed :

```sql
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
- **Voix** : jamais inventer un montant ; `amount: null` si doute. La réponse du
  modèle distant est revalidée, nom du membre compris.

## Tests

`npm run verify` enchaîne `tsc --noEmit` puis les tests. Les cas couverts
tiennent aux erreurs déjà rencontrées : rejeu d'un lot, entrée illisible,
montant décimal, phrase sans mot-clé, réponse aberrante du modèle.
