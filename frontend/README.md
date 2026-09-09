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

## Commandes

| Commande               | Effet                                            |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Serveur de développement                         |
| `npm run build`        | Build de production                              |
| `npm run verify`       | Format + lint + types + tests unitaires          |
| `npm run test`         | Tests unitaires (Vitest)                         |
| `npm run test:e2e`     | Parcours de démo (Playwright, mobile et bureau)  |

## Pourquoi les adresses sont en `?caisse=…`

Next.js va chercher le code d'une page au moment où l'on y navigue. Avec des
routes comme `/caisses/[id]`, tout écran jamais ouvert était **inaccessible dès
la perte du réseau** : la trésorière validait sa cotisation et tombait sur
« vous êtes hors connexion ».

Les routes sont donc sans segment dynamique, et l'identifiant voyage dans la
requête. Elles sont alors pré-rendues au build, et `scripts/build-sw.mjs` les
inscrit toutes — avec leur code — dans le service worker. Résultat : **chaque
écran s'ouvre sans réseau, dès le premier lancement, y compris jamais visité.**

Deux garde-fous : `tests/unit/routes.test.ts` vérifie qu'aucun écran n'échappe à
la liste `STATIC_PATHS`, et `tests/e2e/hors-ligne.spec.ts` ouvre réellement des
pages avec le réseau coupé. En ajoutant un écran, ajoutez son chemin à
`STATIC_PATHS` dans `lib/routes.ts` — le test unitaire échouera sinon.

Le parcours saisie → confirmation → succès tient dans une seule page
(`components/operation/operation-flow.tsx`) : entre le moment où la trésorière
parle et celui où elle voit son reçu, aucune requête réseau.

## Organisation

```
frontend/
├── app/            Routes App Router, une par écran de maquette
│                   page.tsx = enveloppe Suspense, screen.tsx = l'écran
├── components/
│   ├── ui/         Primitives (bouton, carte, champ, badge…)
│   ├── layout/     En-tête, menu, bandeaux hors ligne
│   ├── caisse/     Cartes et lignes de caisse
│   ├── membre/     Fiche membre, formulaire, score AKWÈ
│   └── operation/  Micro, filtres, lignes d'opération
├── lib/
│   ├── db/         Dexie : schéma, dépôt de données, jeu de démonstration
│   ├── sync/       File d'attente et transport vers le backend
│   ├── voice/      Reconnaissance vocale et extraction en français
│   ├── hooks/      Lectures réactives sur IndexedDB
│   └── routes.ts   Toutes les adresses de l'application
└── tests/          Tests unitaires et de bout en bout
```

## Règles de ce dossier

- **Aucun fichier ne dépasse 150 lignes.** Au-delà, on extrait un composant.
- **Les montants sont des entiers en FCFA.** Formatage via `lib/format.ts`.
- **Toute écriture passe par IndexedDB puis la file de sync.** Jamais de `fetch`
  depuis un composant.
- **Quatre états à gérer systématiquement** : chargement, vide, erreur, hors ligne.
- **Zones tactiles de 48 px minimum**, textes en français simple.
