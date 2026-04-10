# TODO — Commission Tracker

## Terminé (2026-04-08)
- [x] Fusion Drive + Email → Workspace
- [x] Reem AI V1 (widget, panel, insights, bubble)
- [x] Audit global 4 axes (113 fichiers, 47 fixes)
- [x] Phases 2A-2C + Phase 3 (audit remediation)
- [x] Fixes prod (env vars, layout, DataCard scroll)

## Terminé — Calendrier de Présence (2026-04-10)
**Objectif :** Journal de présence intégré à l'app, branché sur Google Sheet, règle des 183 jours France.

- [x] Brainstorm + design validé
- [x] Spreadsheet ID confirmé : 13SeeG6LgR6k2725VfxkjHpBiQlKbyVXclx_pz05g2-g
- [x] Scope OAuth Google Sheets (read/write)
- [x] Helper lib/sheets.ts (read/write/parse)
- [x] API route GET/PUT /api/sheets/presence
- [x] Hook usePresence (optimistic toggle, compteurs)
- [x] Composants : CalendrierGrid, CompteurCards, AlerteSeuil
- [x] Page /dashboard/calendrier-presence + skeleton
- [x] Nav item sidebar "Présence"
- [x] Validation Zod sur PUT, fix year display, cleanup
- [x] Build + lint + tests (41/41) OK

**À tester en local :** se reconnecter Google (nouveau scope), vérifier lecture/écriture Sheet.
