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
- Contact : ladislas2005@gmail.com / +973 3400 8825
- Banque : Al Salam Bank, IBAN BH32ALSA00387049100101, SWIFT ALSABHBM

## Base de données Supabase
- users : admin (Hugues-Henri) + associé (Ladislas)
- primes : LED (#6366f1), Quadricycle (#f59e0b), Vélo cargo (#10b981) + primes dynamiques
- commissions : liées à Ladislas (user_id), avec ca, commission, dossiers, mois, status
- paiements : 3 statuts (effectue, en_attente, en_retard), globaux toutes primes
- activity_log : historique des actions CRUD
- Realtime activé sur toutes les tables

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
- npm run build doit passer sans erreur avant chaque commit

## Skills installés
- ui-ux-pro-max-skill : installé dans .claude/skills/ui-ux — utiliser les guidelines de ce skill pour tout le frontend (design, animations, typographie, couleurs, layout)
