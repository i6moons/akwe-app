# AKWÈ 🌍💸

**Ni une banque, ni un moyen de paiement : le carnet intelligent qui transforme 30 ans de tontines invisibles en historique de crédit bancable.**

## 🚨 Le Problème
Au Bénin, des centaines de milliers de femmes épargnent dans des tontines (groupements villageois)[cite: 1]. Le système repose sur un cahier papier et la mémoire de la trésorière[cite: 1].
* **Conséquences :** Pertes (cahier mouillé/perdu), fraudes, litiges et surtout une **invisibilité financière totale** (aucun historique de crédit pour les banques)[cite: 1].

## 💡 La Solution (Les 4 briques)
AKWÈ transforme le cahier de tontine en un carnet numérique adapté aux réalités locales :
1. **Le carnet vocal (IA) :** Saisie des transactions par la voix en français/langues locales (contourne la barrière de l'alphabétisation)[cite: 1].
2. **Le mode hors-ligne réel :** Application PWA "offline-first" fonctionnant sans internet, avec synchronisation à la reconnexion[cite: 1].
3. **Le reçu automatique :** Notification WhatsApp/SMS et encaissement Mobile Money[cite: 1].
4. **Le score AKWÈ :** Création d'un score de crédit exportable pour les institutions de microfinance (IMF)[cite: 1].

## 🛠 Stack Technique
* **Frontend :** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui[cite: 1].
* **Backend & Auth :** Supabase (PostgreSQL, RLS)[cite: 1].
* **Offline :** Dexie.js (IndexedDB) + Service Worker[cite: 1].
* **IA (Voix) :** Web Speech API / API LLM (Claude/Groq) pour la structuration JSON[cite: 1].
* **Paiement :** KkiaPay / FedaPay (Sandbox)[cite: 1].

## 👥 L'équipe (GrokBot Hackathon x Devs Days)
* **OWOLABI Nafissathou :** Chef d'équipe, Pitch & UI
* **AMINOU Malick :** Lead Technique, Architecture Backend, Supabase & IA LLM
* **AGBOYINOU Del Prudence :** Dev Front-end, Architecture Offline-first & PWA

## Installation (Mode Développement)
```bash
git clone [https://github.com/votre-compte/akwe-app.git](https://github.com/votre-compte/akwe-app.git)
cd akwe-app
npm install
npm run dev
