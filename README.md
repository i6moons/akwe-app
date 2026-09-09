# AKWÈ 🇧🇯

**Ni une banque, ni un moyen de paiement : le carnet intelligent qui transforme
30 ans de tontines invisibles en historique de crédit bancable.**

_Akwɛ́ = « argent » en fon._

## 🚨 Le problème

Au Bénin, des centaines de milliers de personnes — en majorité des femmes —
épargnent dans des tontines. Le système entier repose sur un cahier papier et la
mémoire d'une trésorière. Résultat : des litiges, des pertes, des fraudes.

Et surtout : une femme qui a cotisé 500 000 F sans jamais faillir pendant quatre
ans reste, pour une banque, **une personne sans historique de crédit**.

Le paradoxe qui fonde le projet : 11,65 millions de comptes mobile money actifs
au Bénin, 88 % de pénétration des services financiers mobiles — et une épargne
toujours invisible.

## 💡 La solution — les 4 briques

1. **Le carnet vocal** — la trésorière parle, l'IA structure la transaction.
2. **Le hors ligne réel** — PWA, fonctionne sans réseau, synchronise ensuite.
3. **Le reçu automatique** — WhatsApp/SMS à chaque cotisation. Fin des litiges.
4. **Le score AKWÈ** — régularité et ancienneté transformées en score de crédit.

## 📁 Organisation du dépôt

```
akwe-app/
├── frontend/     Application Next.js 15 — écrans, PWA, offline    (Prudence)
├── backend/      Schéma Supabase, contrats d'API, IA vocale       (Malick)
└── .github/      Intégration continue, déploiement, modèles
```

Les deux dossiers sont indépendants et se parlent par un contrat unique :
[`backend/contracts/api.ts`](./backend/contracts/api.ts).

Le frontend est **utilisable sans backend** : il écrit dans IndexedDB et empile
les opérations dans une file d'attente jusqu'au retour du réseau.

## 🚀 Démarrer

```bash
git clone https://github.com/i6moons/akwe-app.git
cd akwe-app/frontend
cp .env.example .env.local
npm install
npm run dev
```

Détails par dossier : [`frontend/README.md`](./frontend/README.md) ·
[`backend/README.md`](./backend/README.md)

## 🛠 Stack

| Couche       | Choix                                          |
| ------------ | ---------------------------------------------- |
| Framework    | Next.js 15 (App Router) + TypeScript strict    |
| Style        | Tailwind CSS, composants maison façon shadcn/ui|
| Hors ligne   | Dexie.js (IndexedDB) + service worker          |
| Base et auth | Supabase (PostgreSQL, RLS)                     |
| Voix         | Web Speech API + extraction LLM structurée     |
| Déploiement  | Vercel, via GitHub Actions                     |

## ✅ Qualité

Chaque poussée déclenche : format, lint, types, tests unitaires, build,
parcours de démo Playwright, et application du schéma SQL sur une base neuve.

```bash
cd frontend && npm run verify
```

## 👥 L'équipe — GrokBot Hackathon × Devs Days

| Membre                        | Rôle                                             |
| ----------------------------- | ------------------------------------------------ |
| **OWOLABI Nafissathou**       | Chef d'équipe, produit et pitch                   |
| **AMINOU Malick**             | Lead technique — Supabase, API, IA vocale         |
| **AGBOYINOU Del Prudence**    | Frontend et UX — écrans, offline, PWA             |
| **CODO IFAH MAHUENA Maria-Lysel** | Interface et démonstration                    |

## 📄 Documents

- [`SPEC.md`](./SPEC.md) — spécification et modèle de données
- [`.cursorrules`](./.cursorrules) — règles du projet lues par Cursor
