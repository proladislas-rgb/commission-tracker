# Commission Tracker — Contexte Projet

## Stack
- Next.js 16 + TypeScript + Tailwind CSS + Supabase + Recharts
- Déployé sur Vercel : commission-tracker-neon.vercel.app
- Repo : github.com/proladislas-rgb/commission-tracker (branche main)

## Rôles
- Admin : Hugues-Henri (supervise, modifie, renomme, crée des primes)
- Associé : Ladislas (injecte les données, ajoute commissions/paiements)
- Client unique : ECODISTRIB (29 Rue Pradier, 92410 Ville-d'Avray, SIREN 903 879 492)

## Entreprise émettrice
- LR Consulting W.L.L
- Bldg. 40, Road 1701, Block 317, Diplomatic Area, Kingdom of Bahrain
- C.R. Number: 190710 - 1
- Contact : proladislas@gmail.com / +973 3400 8825
- Banque : Al Salam Bank, IBAN BH32ALSA00387049100101, SWIFT ALSABHBM

## Base de données Supabase (project ID: kscpxenxttrxlzfuktyf)
- users : admin (Hugues-Henri) + associé (Ladislas)
- clients : multi-client avec pin/unpin, ECODISTRIB = premier client
- primes : LED (#6366f1), Quadricycle (#f59e0b), Vélo cargo (#10b981) + primes dynamiques, liées par client_id
- commissions : liées à Ladislas (user_id), avec ca, commission, dossiers, mois, status, client_id
- paiements : 3 statuts (effectue, en_attente, en_retard), client_id, commission_id (pour réconciliation future)
- sommes_dues : montants à percevoir par client
- channels : canaux chat (general + par client)
- messages : messages chat avec reactions JSON, fichiers, vocaux
- activity_log : historique des actions CRUD
- Realtime activé sur toutes les tables
- RLS activé sur 9/9 tables avec policies anon ciblées
- Storage bucket : chat-files (public, pour uploads chat + vocaux)

## Design system dark mode
- bg: #07080d, surface: #0f1117, raised: #151a24
- txt: #e8edf5, txt2: #8898aa, txt3: #3d4f63
- indigo: #6366f1, amber: #f59e0b, emerald: #10b981, green: #22c55e, rose: #f43f5e, sky: #38bdf8
- Rayons: 14px cartes, 8px boutons
- Toutes les valeurs numériques Supabase doivent être converties avec Number() || 0
- Les comparaisons d'ID utilisent String() pour éviter les type mismatch
- Les modales utilisent createPortal(document.body) pour éviter les problèmes de stacking context

## Règles de développement
- TypeScript strict, pas de any
- Tout en français (labels, messages, placeholders)
- Logger chaque action CRUD dans activity_log
- Permissions : vérifier le rôle (admin/associe) avant chaque action
- Source unique de vérité : useCommissions pour CA/commissions, usePaiements pour paiements
- npm run build + npm run lint + npm test doivent passer avant chaque commit
- Toute API route doit avoir getSessionUser() en guard
- Validation Zod sur les inputs API
- Pas de console.log en prod (sauf console.warn dans supabase.ts)

## Sécurité (session 5 avril 2026)
- Auth JWT (jose) sur 14/14 API routes via getSessionUser()
- Validation Zod : activity, invoice/chat, taille/type upload, email
- RLS Supabase activé 9/9 tables, policies anon ciblées
- SERVICE_ROLE_KEY configurée (bypass RLS côté serveur)
- AUTH_SECRET obligatoire en prod (crash si manquant)
- Sanitization nom fichier upload (anti path traversal)
- Validation folderId Drive (anti injection)
- escapeHtml sur contenu email notifs (anti XSS)

## Tests (Vitest)
- 25 tests : auth lib (5), auth guards API (10), validation inputs (10)
- Config : vitest.config.ts, __tests__/setup.ts
- npm test = vitest run

## CI/CD
- GitHub Actions : .github/workflows/ci.yml (lint → tests → build sur push/PR)
- Déploiement auto Vercel sur push main

## Features ajoutées (session 5 avril 2026)
- Error boundaries : app/error.tsx, app/not-found.tsx, app/dashboard/error.tsx
- Skeleton loaders : loading.tsx sur toutes les sous-pages dashboard
- ErrorAlert composant réutilisable + affichage erreurs hooks dans dashboard
- Pagination 10/page sur CommissionTable
- Optimistic update sur useSommesDues.add
- Export Excel .xlsx (2 feuilles) via SheetJS (import dynamique)
- Filtres avancés CommissionTable : statut, plage mois, montant CA min/max
- Toast notifications (success/error/info/warning) avec auto-dismiss 4s
- Chat vocaux : MediaRecorder, détection MIME auto, player audio inline
- Chat drag & drop : overlay plein écran, compteur dragEnter/Leave
- Chat mentions @ : autocomplétion utilisateurs, highlight indigo
- Notifs email : mail instantané sur @mention, digest si offline > 5 min
- Signature LR Consulting auto sur tous les mails envoyés
- Injection facture → paiement : libellé éditable, client_id, parsing date robuste
- Email : proladislas@gmail.com partout (facture, signature, notifs, export)

## Prochaine feature identifiée
- Réconciliation Commission ↔ Paiement : lier un paiement à une commission, gestion partiel, statut auto (dû → partiel → payé), la colonne commission_id existe déjà dans paiements mais n'est pas utilisée

## Skills installés
- ui-ux-pro-max-skill : installé dans .claude/skills/ui-ux — utiliser les guidelines de ce skill pour tout le frontend (design, animations, typographie, couleurs, layout)
