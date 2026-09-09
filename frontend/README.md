# AKWÈ — Frontend

Responsable : **AGBOYINOU Del Prudence**.
Écrans, composants, mode hors ligne côté client, PWA.

## Démarrer

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

L'application fonctionne **sans backend** : au premier lancement, une caisse de
démonstration (« Tontine Ayaba », Godomey, 12 membres, 8 semaines d'historique)
est écrite dans IndexedDB.

## Vercel

Root Directory du projet : **`frontend`**. Fichier [`vercel.json`](./vercel.json).

Importer le dépôt : [vercel.com/new](https://vercel.com/new) → `i6moons/akwe-app` →
Root Directory = `frontend`.

Variables (pitch) :

- `NEXT_PUBLIC_DEMO_MODE` = `true` — démo hors ligne, sans clé
- Plus tard : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement)
