# Audit global Commission Tracker — 2026-04-08

**Périmètre :** 113 fichiers source, 13 035 lignes. Audit simultané sur 4 axes (dette technique, sécurité, bugs, performance) via sous-agents parallèles.

**Faux positif écarté :** l'audit sécurité a flaggé `proxy.ts` comme « middleware inactif ». C'est faux : Next.js 16 a déprécié `middleware.ts` au profit de `proxy.ts` (convention officielle, migration faite dans cette session, confirmée par le build log `ƒ Proxy (Middleware)`). **Ignoré.**

---

## 🔴 CRITIQUE — À fixer avant le push Vercel

Des bugs exploitables, des régressions silencieuses ou des pertes de données. 7 items.

### C1 — Bug cookie Google OAuth inversé (3 fichiers)
**Fichiers :** `app/api/drive/list/route.ts:88`, `app/api/drive/delete/route.ts:67`, `app/api/drive/upload/route.ts:102`
**Problème :** La condition de refresh cookie est inversée. La branche `if` est vide, la branche `else` fait le refresh. Résultat : le cookie token Google n'est PAS mis à jour au bon moment → expiration silencieuse.
**Fix :** Inverser la condition OU swap les branches.

### C2 — Chat upload : usurpation d'identité via `userId` client-supplied
**Fichier :** `app/api/chat/upload/route.ts:18-62`
**Problème :** Le route lit `userId` depuis le formData et l'écrit en DB sans vérifier qu'il correspond à `session.id`. Un utilisateur authentifié peut poster des messages au nom d'un autre (ex: admin).
**Attaque :** `formData.append('userId', adminUuid)` → le message apparaît comme envoyé par l'admin.
**Fix :** Remplacer `user_id: userId` par `user_id: session.id`.

### C3 — XSS dans le digest email chat notifications
**Fichier :** `app/api/chat/notify/route.ts:126-129`
**Problème :** `sender` (display_name) et `m.content` sont interpolés dans un HTML d'email sans échappement. La fonction `escapeHtml` existe dans le même fichier mais n'est pas utilisée ici.
**Attaque :** Un utilisateur met son display_name à `<img src=x onerror=...>` ou envoie un message HTML malicieux → exécution dans le client mail destinataire.
**Fix :** Wrap les deux avec `escapeHtml()` (fonction déjà présente).

### C4 — Duplicate channel names dans `useRealtime`
**Fichier :** `hooks/useRealtime.ts`
**Problème :** Les channels Supabase sont nommés `realtime:${table}:${filter ?? 'all'}`. Deux instances du même hook avec même table → même nom → Supabase partage le channel → unmount d'une instance détruit silencieusement l'autre.
**Impact actuel :** Dormant (chaque hook mounted une seule fois). Fragile à toute duplication future.
**Fix :** Ajouter un UUID unique par instance au nom du channel.

### C5 — Stale callback closures dans `useRealtime`
**Fichier :** `hooks/useRealtime.ts:46-47`
**Problème :** `onInsert`/`onUpdate`/`onDelete` exclus des deps via `eslint-disable`. Tous les callers DOIVENT utiliser des functional updaters. Aucune enforcement — un futur refactor qui oublie cette règle introduira un stale closure silencieux.
**Fix :** Passer les callbacks via `useRef` mis à jour à chaque render → handlers stables mais lisant toujours le latest.

### C6 — setState après unmount dans `useMessages` realtime
**Fichier :** `hooks/useMessages.ts:48-63`
**Problème :** Le callback realtime INSERT fait un `await supabase.from('messages').select(...)` puis `setMessages`. Si le composant unmount pendant l'await, le setState fire sur un composant démonté.
**Fix :** Ajouter un `isMounted` ref ou `AbortController`.

### C7 — N+1 queries unread badge (fire à CHAQUE message chat)
**Fichiers :** `components/layout/Sidebar.tsx:79`, `app/dashboard/chat/page.tsx:22`
**Problème :** `fetchUnread()` fait 1 query `channels` + N queries `messages` (1 par channel) en **séquentiel** (`for...of + await`). Déclenché sur chaque INSERT realtime `messages` (sans filtre). Avec 3 channels × 2 users actifs, chaque keystroke envoyé = 4 round-trips Supabase séquentiels × 2 instances (sidebar + page).
**Impact utilisateur :** Badge chat clignote avec délai, charge Supabase gaspillée, app "pas fluide".
**Fix :** Une seule query avec `GROUP BY channel_id` OU `Promise.all()` des counts. Filtrer la realtime subscription par `channel_id`.

---

## 🟠 IMPORTANT — À fixer pendant la phase d'audit

Dette réelle, impact modéré, pas bloquant pour le push mais doit être nettoyé. 23 items.

### Sécurité (8)
- **I1** — Rate limiting manquant sur `/api/auth/login` et `/api/auth/register` (brute force + enumeration)
- **I2** — Race condition sur registration : deux concurrent `count === 0` peuvent créer 2 admins
- **I3** — `AUTH_SECRET` a un fallback en dev ; un preview Vercel mal configuré peut forger des tokens
- **I4** — `SUPABASE_SERVICE_ROLE_KEY` fallback silencieux sur anon → comportement changé sans alerte
- **I5** — Pas de `server-only` guard sur `supabaseAdmin` (risque structurel si import accidentel)
- **I6** — `/api/email/send` sans validation Zod sur subject/body (pas de max length)
- **I7** — Blocklist MIME sur `/api/chat/upload` au lieu d'allowlist + pas de magic bytes check
- **I8** — `init-clients-table.sql:15` contient `DISABLE ROW LEVEL SECURITY` (migration dangereuse)

### Bugs (6)
- **I9** — Double fetch + double subscription `associe` (layout + page) → conflit realtime
- **I10** — `useTyping.ts:53` setTimeout sans cleanup au unmount
- **I11** — `Toast.tsx:74-82` setTimeout IDs non tracés, pas de cleanup
- **I12** — `Sidebar.tsx:121-131` interval lit `user?.id` depuis closure stale
- **I13** — `useMessages.ts:97-119` addReaction cascade thundering deps
- **I14** — `chat/page.tsx` fetchUnread sans mounted guard, pas d'AbortController
- **I15** — `ReemWidget.tsx:48-53` Escape handler se re-attache à chaque change de visibility

### Tech debt (6)
- **I16** — `StoredTokens` interface dupliquée dans 5 fichiers Drive/email
- **I17** — `DriveAttachment` / `LocalAttachment` / `Attachment` dupliqués entre `lib/workspace.ts` et `app/api/email/send/route.ts`
- **I18** — `DriveFile` dupliqué (5 fields additionnels) dans `app/api/drive/list/route.ts` alors que `lib/drive.ts` existe
- **I19** — `loadAssociate` + realtime subscription dupliqués entre `layout.tsx` et `page.tsx`
- **I20** — `canEdit === canDelete` dans `CommissionTable.tsx:147-148`
- **I21** — `postgres_changes as any` cast dupliqué 8 fois (déjà abstrait par `useRealtime`, 4 call sites à migrer)

### Performance (3)
- **I22** — `loadAssociate` + `loadPrimes` séquentiels au mount du dashboard (devrait être `Promise.all`)
- **I23** — `useMessages` fait un fetch supplémentaire à chaque message realtime (2 round-trips au lieu d'1, pour résoudre le join user)
- **I24** — Chart formatters inline dans `CaCommissionChart.tsx`/`RepartitionChart.tsx` → Recharts re-render Y-axis à chaque parent render

---

## 🟡 MINEUR — Nice to have

Polish, défense en profondeur, lisibilité. 18 items. Détails dans les rapports bruts mais non listés ici pour concision.

Exemples :
- Gmail/Anthropic error details leaked to client (leak mineur d'infos internes)
- `logout` ne clear pas `google_tokens`
- JWT 7 jours sans rotation
- `.gitignore` pas exhaustif pour les variants `.env`
- `PAGE_SIZE = 10` magic number inline
- Exports inutilisés (`DraftUpdater`, `invalidateReemInsightsCache`)
- Sidebar trop gros (435 lignes)
- Inline `() => {}` pour `onMobileMenuOpen` vestigial
- Etc.

---

## ✅ Points positifs (à conserver)

- Tous les 19 API routes ont `getSessionUser()` guard
- Admin-only route protégée correctement
- JWT via `jose` avec `HS256` propre
- Pas de `dangerouslySetInnerHTML`, `eval()`, `exec()`
- Pas de raw SQL concat — toutes les queries via query builder typé
- `escapeHtml` appliqué correctement sur le path mention email
- `folderId` sanitisé avec regex allowlist
- Path traversal mitigé sur uploads (`replace(/[^a-zA-Z0-9._-]/g, '_')`)
- Optimistic updates + rollback consistent sur toutes les données
- Charts memoizés avec `useMemo` correctement
- `ExportButton` lazy-load SheetJS via `await import('xlsx')`
- `useMessages` limite à 50 + filtered realtime
- `ReemInsights` cache 5min localStorage
- Tous les hooks et providers cleanup correctement leurs channels Supabase
- `lib/types.ts` source unique de vérité propre
- Zod validation présente sur les routes user-input sensibles
- Tools LLM read-only par design en V1

---

## 📊 Métriques consolidées

| Catégorie | Critique | Important | Mineur |
|---|---|---|---|
| Sécurité | 2 | 8 | 7 |
| Bugs | 4 | 6 | 6 |
| Performance | 4 | 9 | 4 |
| Tech debt / duplications | 1 | 6 | 6 |
| **TOTAL** | **7** (dont 4 sont des 2 mêmes bugs croisés) | **23** | **18** |

*Note : plusieurs findings cross-listés (ex: C7 N+1 apparaît en bugs ET perf). Le total déduplaqué est ~44 items distincts.*

---

## 🎯 Plan de remédiation proposé

**Phase 1 — Critiques (avant push Vercel)**
Les 7 items Critical. Effort estimé : 2-3 heures. Chacun est un fix localisé, bien identifié.

**Phase 2 — Importants (enchaînés après Phase 1)**
Les 23 items Important. Groupés en sous-paquets logiques :
- Groupe A : **Dédoublonnage des types et interfaces** (I16, I17, I18, I21) — 1h, zéro risque
- Groupe B : **Consolidation layout/page dashboard** (I19, I22) — fix l'effet de double fetch
- Groupe C : **Cleanup timers et subscriptions** (I10, I11, I12, I14, I15) — 30 min
- Groupe D : **Sécurité hardening** (I1–I8) — 2h (rate limiting + server-only + Zod complet)
- Groupe E : **Perf memoization charts** (I23, I24) — 30 min

**Phase 3 — Mineurs (optionnels avant push)**
Polish et défense en profondeur. Peuvent être groupés ou échelonnés sur plusieurs sessions.

---

## Recommandation d'ordre d'exécution

1. **Phase 1 d'abord** (7 critiques) — bloquant, fix en un enchaînement
2. **Phase 2 groupes A + B + C** (rapide, haute valeur) — 2h
3. **Phase 2 groupes D + E** — 2h
4. Build + test + audit final reviewer
5. **Push Vercel**
6. Phase 3 (mineurs) en follow-up si le temps le permet

Effort total phase 1+2 : **6-8 heures** en subagent-driven mode.
