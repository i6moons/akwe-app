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
| `src/sync/` | Upsert idempotent (`client_uuid`) |
| `src/voice/` | Parseur FR local + LLM optionnel (Groq) |
| `src/receipts/` | WhatsApp / SMS (mock si pas de jeton) |
| `src/server.ts` | Serveur HTTP autonome (port 3460) |
| `../frontend/app/api/*` | Adaptateurs Next (même handlers) |

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
2. `supabase/migrations/0002_rls.sql` — politiques (si `0001` ne les a pas déjà)
3. `supabase/seed.sql` — Tontine Ayaba, solde attendu **174 000 F**

Le projet hébergé a déjà reçu le schéma + le seed. Ne pas relancer `0002` si
les politiques existent (« policy already exists »).

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

- **Montants = entiers FCFA.** Refus des floats.
- **`client_uuid` unique** → rejeu de file sans doublon.
- **RLS** : une trésorière ne voit que ses caisses.
- **Voix** : jamais inventer un montant ; `amount: null` si doute.
