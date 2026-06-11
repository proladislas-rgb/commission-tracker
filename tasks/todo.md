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

## Terminé (2026-04-17) — Audit post-fix + renforcement (review code + sécurité)
- [x] `lib/google.ts` : `OAUTH_ERROR_CODES`, `isOAuthError()`, `clearGoogleTokensCookie()` centralisés
- [x] `components/ui/ReconnectGoogleBanner.tsx` : composant réutilisable (POST + redirect)
- [x] Auto-clear du cookie `google_tokens` côté serveur sur `invalid_tokens`/`token_expired`/`refresh_failed` dans TOUTES les routes OAuth (drive/list, upload, delete, download ; sheets/presence ; email/send). Self-healing.
- [x] CSRF fix sur `/api/auth/google/disconnect` : GET → POST + check `Origin` strict + retourne JSON avec l'URL OAuth consent
- [x] Chat upload : reject MIME vide explicite, stocke le MIME normalisé (pas les params codec du client) dans Supabase + messages.file_type, retire `details: error.message` (leak backend)
- [x] ChatWindow : états séparés `uploadError` / `googleAuthLost` / `notifyFailures`. Accumulation (plus d'overwrite), handled via `isOAuthError` + `ReconnectGoogleBanner`
- [x] ChatInput : guard double-click via `startingRef`, auto-clear `recordingError` sur start réussi
- [x] DriveExplorer : handle TOUS les codes OAuth via `isOAuthError` (plus seulement `not_connected`)
- [x] Notify digest : log les failures (plus de silent catch)
- [x] Lint OK, 41/41 tests OK, `npm run build` OK

**À tester en local :**
- `/dashboard/workspace` → doit afficher "Connecter Google" (tokens révoqués par le changement de mdp)
- `/api/auth/google/disconnect` → redirige vers OAuth consent, permet la reconnexion
- `/dashboard/calendrier-presence` → si erreur OAuth, bouton "Reconnecter Google" visible
- `/dashboard/chat` → cliquer sur le micro, vérifier qu'une erreur lisible s'affiche si permission refusée, ou que le vocal s'enregistre/s'envoie. Si upload échoue, lire le code d'erreur dans le bandeau pour diagnostic.

## Terminé (2026-06-10) — Stabilisation (chasse aux catch silencieux)
- [x] `useMessages` : envoi message — l'insert Supabase ne throwait pas (`{ error }` ignoré) → message perdu sans signal. Fix : check error + bandeau rose dans ChatWindow avec aperçu du message perdu
- [x] `useMessages.load` + `useChannels.load` : échec = chat vide muet → désormais erreur exposée + bouton "Réessayer" sur la page chat
- [x] 11 catch silencieux d'arrière-plan (Sidebar ×5, dashboard ×4, useAgentMessages ×2) → console.error avec contexte
- [x] ESLint ignorait pas `telegram-bot/` (sous-repo séparé) → lint cassait en local. Fix : ajout aux ignores
- [x] Vérifié : timers tous cleanup, useRealtime C4/C5 OK, useMessages C6 OK, hooks data exposent leurs erreurs
- [x] lint 0 erreur + 41/41 tests + build OK
- Hors scope volontaire : Reem AI (refonte totale prévue), ReemInsights catch localStorage (bénins)

## Refonte UI « Liquid Glass » (spec validée 2026-06-10)
Spec : `docs/superpowers/specs/2026-06-10-ui-redesign-liquid-glass-design.md`
Design system global : `~/.claude/design-systems/liquid-glass.md` (réutilisable tous projets)
- [x] Brainstorm visuel (compagnon navigateur) → direction « Glass sombre pro » validée par Hugues
- [x] Spec écrite + design system extrait en global
- [ ] Plan d'implémentation (writing-plans) — à faire à la reprise
- [ ] Phases 0→6 : tokens → primitives → AppShell → Dashboard → Chat → autres pages → audit visuel
- [ ] Contraintes : reskin pur (zéro changement hooks/lib/api), 41 tests verts à chaque phase, validation navigateur avant push
- [ ] Ensuite : refonte fonctionnelle Reem AI (chantier séparé)

### Refonte UI — état au 2026-06-10 soir (branche `ui/liquid-glass`, poussée)
- [x] Tasks 1-6 du plan : tokens, primitives, sidebar verre, dashboard (héros+sparkline), chat, toutes les pages + login/register vitrine
- [x] Task 7 partiel : Reem reskin minimal (palette), CLAUDE.md à jour, audit reviewer sous-agent passé (2 critiques corrigés : couleurs DB avatar/client restaurées)
- [x] Vérifs : lint 0 erreur, 41/41 tests, build OK, smoke routes OK (login/register 200, middleware 307 OK)
- [x] **GATE passé 2026-06-11 : validation Hugues sur preview → merge main → push → prod Vercel**
- [ ] Ensuite : refonte fonctionnelle Reem AI (chantier dédié)

## Retouches UI post-déploiement (2026-06-11)
Demande Hugues (screenshots prod) :
- [x] Héros « Solde dû » (KpiGrid) : décomposition précise du solde + barre de répartition segmentée
- [x] Graphique Suivi paiements (PaiementTracker) : agrégation mensuelle, barres empilées par statut, cumul, légende
- [x] lint + 41 tests + build + reviewer sous-agent (bug DST corrigé)
- [x] Push branche ui/liquid-glass → validation Hugues sur preview → merge main (2026-06-11)

## Refonte Reem AI — brainstorm en cours (2026-06-11)
Direction validée : **Reem façon OpenClaw = membre du chat interne** (DM Reem + @reem, messages proactifs, cartes d'action inline). Widget flottant + insights dashboard supprimés à terme.
Décisions : scope complet (saisie NL, chiffres fiables, alertes, récaps) · autonome sauf actions sensibles · alertes in-app only, pas de relance client · anti-chatbot-nul : chiffres = SQL exact, streaming, zéro bavardage, proactivité parcimonieuse.
- [ ] **REPRISE ICI** : valider archi option 1 (routes Next.js + after() + Vercel Cron) + Reem dans `users` (rôle agent) + fonctions SQL d'agrégation
- [ ] Design section par section → spec docs/superpowers/specs/2026-06-11-reem-ai-refonte-design.md → self-review → revue Hugues → writing-plans
- Maquette validée : .superpowers/brainstorm/30658-1781169174/content/form-factor-v2-openclaw.html
- Détail complet : mémoire Claude `project_reem_refonte.md`
