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

## Terminé (2026-04-17) — Fix vocaux chat + reconnect Google après changement mdp
- [x] Workspace : fix détection "connecté" (401 → force reconnect, plus de faux positif sur refresh_failed/token_expired/invalid_tokens)
- [x] Calendrier présence : bandeau dédié + bouton "Reconnecter Google" sur erreurs OAuth
- [x] Chat `ChatInput` : check `isSecureContext` + `navigator.mediaDevices` + `MediaRecorder`, détection DOMException (NotAllowed/NotFound/NotReadable), bandeau d'erreur visible
- [x] Chat `ChatWindow` : upload expose maintenant `error` + `details` du serveur dans un bandeau, plus de catch silencieux
- [x] Chat upload API : normalisation MIME (`split(';')[0]`) → accepte `audio/webm;codecs=opus` renvoyé par MediaRecorder
- [x] Chat notify : `sendNotificationEmail` retourne maintenant `{ok, error}` et le POST `/api/chat/notify` renvoie 502 avec le code d'erreur quand Gmail API échoue
- [x] Chat `handleSend` : détecte les erreurs OAuth du notify et surface un message "Reconnecte Google" visible
- [x] Lint OK (erreurs pré-existantes telegram-bot seulement), 41/41 tests OK

**À tester en local :**
- `/dashboard/workspace` → doit afficher "Connecter Google" (tokens révoqués par le changement de mdp)
- `/api/auth/google/disconnect` → redirige vers OAuth consent, permet la reconnexion
- `/dashboard/calendrier-presence` → si erreur OAuth, bouton "Reconnecter Google" visible
- `/dashboard/chat` → cliquer sur le micro, vérifier qu'une erreur lisible s'affiche si permission refusée, ou que le vocal s'enregistre/s'envoie. Si upload échoue, lire le code d'erreur dans le bandeau pour diagnostic.
