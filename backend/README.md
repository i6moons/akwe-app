# AKWÈ — Backend

Responsable : **AMINOU Malick** (lead technique).
Base de données, API, synchronisation serveur et IA vocale.

> Le frontend ne fait **aucun** appel réseau direct depuis un composant. Il écrit
> dans IndexedDB puis pousse une file d'attente vers `POST /api/sync`. Le contrat
> exact est dans [`contracts/api.ts`](./contracts/api.ts) — c'est la source de
> vérité partagée entre les deux dossiers.

## Contenu

| Chemin                 | Rôle                                                      |
| ---------------------- | --------------------------------------------------------- |
| `supabase/migrations/` | Schéma SQL et politiques RLS, appliqués dans l'ordre       |
| `contracts/api.ts`     | Types des requêtes et réponses attendues par le frontend   |

## Mise en route

```bash
# 1. Créer le projet sur supabase.com, puis récupérer l'URL et les clés
cp .env.example .env.local

# 2. Appliquer les migrations, dans l'ordre, depuis le SQL Editor de Supabase
#    supabase/migrations/0001_init.sql
#    supabase/migrations/0002_rls.sql
```

## Points d'attention

- **Les montants sont des entiers en FCFA.** Le schéma utilise `integer`, jamais
  `numeric` ni `float`. Une contrainte `check (amount > 0)` refuse les montants nuls.
- **`transactions.client_uuid` est unique.** C'est la clé d'idempotence : le
  serveur fait un `upsert` dessus, donc un rejeu de la file d'attente après une
  coupure réseau ne crée jamais de doublon.
- **RLS activé sur toutes les tables.** Une trésorière ne voit que ses caisses.

## Endpoints attendus par le frontend

| Méthode | Chemin              | Utilisé par                                  |
| ------- | ------------------- | -------------------------------------------- |
| `POST`  | `/api/sync`         | `frontend/lib/sync/client.ts`                |
| `POST`  | `/api/voice/parse`  | Saisie vocale (repli local si indisponible)  |
| `POST`  | `/api/receipts`     | Reçu WhatsApp / SMS après une cotisation     |
| `HEAD`  | `/api/health`       | Sonde de connexion (déjà servie côté front)  |

Tant que ces routes n'existent pas, le frontend reste **entièrement
fonctionnel hors ligne** : les écritures s'empilent dans la file d'attente et le
badge « en attente » reste affiché.
