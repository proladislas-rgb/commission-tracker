# Reem AI — Agent contextuel flottant

**Date :** 2026-04-08 · **Statut :** V1 validée, V2 documentée pour évolution future

---

## 0. Découpage V1 / V2

Après revue honnête du périmètre, le scope complet est séparé en deux phases.

### V1 — À construire maintenant (ce plan)

Le cœur de valeur IA : Reem **observe, synthétise, rédige, propose** — sans jamais écrire en DB directement.

- Widget flottant 3 états (bulle / panneau / masqué) + raccourci `⌘L` + persistance
- Contextual awareness complet (pathname, client actif, entité courante, brouillon Workspace)
- Suggestions contextuelles par page
- **5 tools seulement** :
  - `query_data` (lecture unifiée multi-entités)
  - `get_overdue_payments`
  - `summarize_period`
  - `draft_email` (rédaction libre ou de relance, retour : lien vers le tiroir Workspace pré-rempli)
  - `search_drive`
- `propose_navigation` : Reem propose toujours des chips cliquables, jamais de navigation silencieuse
- `<ReemInsights />` sur le dashboard, LLM-powered, cache 10min, maximum 3 cartes, placement **discret en bas de page**
- Historique de conversation dans le panneau (bouton 📋)
- Suppression `/dashboard/agent` + nettoyage sidebar

**Pas de V1 :** aucun tool qui modifie la DB (`create_commission`, `create_paiement`, `manage_*`, `post_chat_message`). Zéro `pending_action`, zéro confirmation par étape, zéro carte d'action. Le fichier `confirm/route.ts` reste intact pour d'éventuels appels legacy mais n'est plus déclenché par Reem en V1.

### V2 — Futur, si l'usage prouve le besoin

À construire si après 2-3 semaines d'usage V1 tu te dis « j'ai envie que Reem écrive directement en DB ». Alors on ajoute :

- 7 tools d'action : `create_commission`, `create_paiement`, `manage_client`, `manage_invoice`, `manage_drive`, `manage_prime`, `post_chat_message`
- Modèle d'exécution Option B : cartes `pending_action` par étape avec Accepter/Refuser individuel
- Refactor du loop `tool_use` côté backend pour distinguer tools immédiats / tools différés
- Nouveaux `action` types dans `/api/agent/confirm`

Tout ce qui concerne la V2 dans les sections suivantes est marqué **(V2)**. Les sections non marquées appartiennent à V1.

---

## 1. Vision

Reem passe de **chatbot isolé** (page dédiée `/dashboard/agent`, 9 tools de lecture redondants, aucune conscience du contexte) à **agent copilote**, présent en permanence comme widget flottant, qui peut **agir** sur toutes les ressources de l'app (commissions, paiements, clients, factures, primes, Drive, chat interne), propose des **navigations cliquables** plutôt que d'imposer des actions, et exécute les tâches multi-étapes **étape par étape avec confirmation individuelle**.

La valeur ne vient plus de « requêter les données » — elle vient de **synthétiser, rédiger, agir et proposer**.

---

## 2. Widget — 3 états

| État | Visuel | Zone écran |
|---|---|---|
| **Bulle** (défaut) | Rond 54px, gradient indigo, point vert « en ligne » | Fixed `bottom: 20px; right: 20px` |
| **Panneau ouvert** | Carte 380 × 540px, ancrée coin bas-droite | Fixed `bottom: 20px; right: 20px` |
| **Masqué** | Languette 22 × 60px, bord droit, verticalement centrée | Fixed `right: 0; top: 50%` |

**Transitions (200ms ease-out) :** bulle ↔ panneau (scale + fade), bulle ↔ masqué (fade + slide horizontal).

**Déclencheurs :**
- Clic bulle → panneau
- ✕ panneau → bulle
- Bouton 👁 du panneau → masqué
- Clic languette → bulle
- `⌘L` (Mac) / `Ctrl+L` (Win) → toggle 3-états : masqué → bulle → panneau → bulle
- `Escape` depuis panneau → bulle

**Persistance** : `localStorage["reem.ui"] = { visibility, draftMessage }`, debounce 300ms, validation structurelle au montage.

**Coexistence Workspace** : le panneau 380×540 ancré en bas-droite ne chevauche pas le tiroir email du Workspace (460px pleine hauteur à droite). Les deux peuvent être ouverts simultanément.

---

## 3. Contexte injecté dans chaque requête

À chaque envoi, le frontend enrichit le body POST avec :

```typescript
interface ReemContext {
  pathname: string              // "/dashboard/clients/ecodistrib-id"
  pageLabel: string             // "ECODISTRIB" (lisible)
  activeClientId: string | null // depuis useClientContext
  selectedEntity?: {
    type: 'client' | 'commission' | 'paiement' | 'invoice' | 'email_draft'
    id?: string
    preview?: string            // résumé court (ex: brouillon email en cours)
  }
}
```

Le backend injecte ce contexte dans **le prompt système** (Reem sait sur quelle page tu es) ET dans **l'`AgentContext` passé aux tools** (les tools peuvent défaulter `client_id` au client actif).

---

## 4. Tools (13 au total)

### 4.1 Lecture (exécution silencieuse, pas de confirmation)

| Tool | Rôle | Paramètres clés |
|---|---|---|
| `query_data` | Lecture unifiée multi-entités | `entity: 'commissions'\|'paiements'\|'clients'\|'invoices'\|'primes'\|'sommes_dues'\|'activity'`, `filters?` |
| `get_overdue_payments` | Paiements en retard >N jours | `threshold_days?`, `client_id?` |
| `summarize_period` | Synthèse narrative chiffrée | `period: 'week'\|'month'\|'quarter'`, `client_id?` |
| `search_drive` | Recherche fichiers Drive par nom | `query` |

### 4.2 Action **(V2)** — exécution différée, confirmation utilisateur individuelle

| Tool | Rôle | Cible DB |
|---|---|---|
| `create_commission` | Créer une commission | `commissions` |
| `create_paiement` | Créer un paiement | `paiements` |
| `manage_client` | Créer / renommer / pin / unpin / supprimer | `clients` |
| `manage_invoice` | Créer / marquer payée / supprimer | (via `/api/invoice/chat`) |
| `manage_drive` | Upload / supprimer / créer dossier | `/api/drive/*` |
| `manage_prime` | Créer / renommer prime | `primes` |
| `post_chat_message` | Poster dans un canal interne | `messages` |

Chaque tool d'action retourne `{ type: 'pending_action', action, data, preview }`. Le frontend affiche une **carte d'action** avec bouton **Accepter** / **Refuser**. Rien n'est écrit en DB tant que l'utilisateur n'a pas cliqué Accepter.

### 4.3 Propositions (sans side-effect)

| Tool | Rôle | Sortie |
|---|---|---|
| `draft_email` | Rédiger un email (relance, confirmation, libre) | Lien cliquable vers `/dashboard/workspace?to=…&subject=…&body=…` qui ouvre le tiroir pré-rempli |
| `propose_navigation` | Proposer d'ouvrir une page | Chip cliquable `→ ECODISTRIB` qui navigue sur clic utilisateur |

**Décision clé :** Reem **ne navigue jamais de son propre chef**. Il propose toujours un lien cliquable. L'utilisateur garde le contrôle.

---

## 5. Exécution multi-étapes **(V2)** — Option B, confirmation individuelle

Quand l'utilisateur demande « rédige et envoie les 3 relances », Reem :

1. Appelle les tools de lecture nécessaires (`get_overdue_payments`) — exécution silencieuse
2. Pour chaque relance, appelle `draft_email` ou `manage_...` → retour `pending_action`
3. Le frontend affiche une **carte d'action par étape**, chacune avec ses propres boutons Accepter/Refuser
4. L'utilisateur valide ou refuse **une étape à la fois**
5. Quand l'utilisateur clique Accepter : le frontend POST `/api/agent/confirm` avec `{action, data}`, la DB est mise à jour, Reem observe le résultat et continue (peut enchaîner l'étape suivante)
6. Si refusé : l'étape est annulée, Reem demande si on continue ou on arrête

**UX critique :** chaque carte pending montre un **preview lisible** (`"Commission LED — ECODISTRIB — avril 2026 — 4 200 €"`) et non un JSON brut. Le bouton est **clair et non-ambigu**.

**Changement backend :** le loop `tool_use` dans `/api/agent/chat` doit distinguer les tools d'action (différés, retour `pending_action`) des tools de lecture (exécutés immédiatement). Les tools d'action ne ferment plus la boucle — la réponse du LLM inclut le texte + les actions en attente, et le frontend gère le suivi.

---

## 6. Insights dashboard (LLM-powered)

### 6.1 Composant et placement

`<ReemInsights />` monté en **bas** de `/dashboard` (après les graphiques et tableaux existants), bloc discret séparé par une ligne, en-tête petit « Reem observe ». Non-intrusif, apparaît en fade au scroll ou au chargement.

### 6.2 Route backend

**`GET /api/agent/insights`** :

1. Récupère l'état courant : `commissions`, `paiements`, `sommes_dues`, `clients` (limités aux 90 derniers jours)
2. Envoie à Claude avec un prompt dédié : *« Analyse ces données et identifie jusqu'à 3 insights actionnables. Pour chaque insight, retourne un titre court (max 8 mots), une description précise (1 phrase), et une action suggérée avec le prompt exact à envoyer à Reem si l'utilisateur clique. »*
3. Parse la réponse JSON structurée retournée par Claude (via `tool_use` côté Anthropic pour garantir le format)
4. Retourne un tableau typé

```typescript
interface Insight {
  id: string
  severity: 'info' | 'warning' | 'alert'
  icon: string            // emoji
  title: string           // max 8 mots
  description: string     // 1 phrase précise avec chiffres
  actionLabel: string     // ex: "Rédiger les relances"
  actionPrompt: string    // ex: "Rédige les relances pour tous les paiements en retard >30j"
}
```

### 6.3 Affichage

3 cartes max, horizontales, compactes. Clic sur une carte → ouvre le panneau Reem et envoie `actionPrompt` automatiquement. Le panneau reste ouvert pour afficher la réponse et les pending actions.

### 6.4 Cache

Le résultat est caché côté client pendant 10 minutes (évite un appel LLM à chaque refresh du dashboard). Bouton « Actualiser » manuel disponible.

---

## 7. Architecture

### 7.1 Fichiers à créer

```
components/reem/
├── ReemWidget.tsx            # orchestrateur 3-états, raccourci ⌘L, monté dans layout global
├── ReemBubble.tsx            # bulle 54px
├── ReemPullTab.tsx           # languette 22×60
├── ReemPanel.tsx             # carte 380×540
├── ReemHeader.tsx            # header avec contexte + boutons historique/masquer/fermer
├── ReemSuggestions.tsx       # chips contextuels
├── ReemPendingActionCard.tsx # carte d'action en attente de confirmation
├── ReemHistoryView.tsx       # vue historique dans le panneau
└── ReemInsights.tsx          # encart dashboard

hooks/
├── useReemContext.ts         # pathname + client actif + entity courante
└── useReemUIPersistence.ts   # {visibility, draftMessage} + localStorage

lib/
├── reem-suggestions.ts       # getSuggestions(pathname, context): string[]
└── agent-tools.ts            # MODIFIÉ — 13 tools, nouvelle structure pending_action

app/api/agent/
└── insights/
    └── route.ts              # GET, LLM-powered
```

### 7.2 Fichiers modifiés

| Fichier | Changements |
|---|---|
| `app/dashboard/layout.tsx` | Ajout `<ReemWidget />` après `{children}` |
| `app/api/agent/chat/route.ts` | Accepte `context` dans body, l'injecte dans prompt + `AgentContext`. Distingue tools action (pending) / tools lecture (immédiats). |
| `app/api/agent/confirm/route.ts` | Accepte les nouveaux `action` (manage_client, manage_invoice, manage_drive, manage_prime, post_chat_message). |
| `lib/agent-tools.ts` | Réécriture : 13 tools, refactor `executeAgentTool` pour retourner `pending_action` sur les actions. |
| `hooks/useAgentMessages.ts` | `sendMessage(message, context)` — nouveau param context obligatoire. `confirmAction` accepte tous les nouveaux action types. |
| `components/agent/AgentMessage.tsx` | Ajoute rendering de `ReemPendingActionCard` pour les `pending_action`. |
| `components/layout/Sidebar.tsx` | Supprime entrée « Reem AI » et son icône. |
| `app/dashboard/page.tsx` | Ajoute `<ReemInsights />` en fin de page. |

### 7.3 Fichiers supprimés

- `app/dashboard/agent/page.tsx`
- `app/dashboard/agent/loading.tsx`

L'historique de conversation reste en base (`agent_messages`), accessible via le bouton « 📋 Historique » du panneau Reem (réutilise `AgentMessage.tsx`).

---

## 8. Design system

Tokens du projet respectés strictement (`CLAUDE.md`) :

- Backgrounds : `#07080d` · `#0f1117` (panneau Reem) · `#151a24`
- Texte : `#e8edf5` · `#8898aa` · `#3d4f63`
- Accent : `#6366f1` → `#818cf8` (gradient bulle et boutons d'action)
- Status : `#22c55e` (online) · `#f59e0b` (warning insight) · `#f43f5e` (alert insight)
- Rayons : 14px panneau · 8px boutons internes · 50% bulle
- Transitions : 200ms ease-out cohérent avec le reste de l'app
- Z-index : widget Reem = 50 · tiroir Workspace = 30

---

## 9. Suggestions contextuelles

Dictionnaire `lib/reem-suggestions.ts` : `getSuggestions(pathname, context): string[]` retourne 3-5 chips selon la page.

| Page courante | Suggestions |
|---|---|
| `/dashboard` | `💡 Résume-moi ce mois` · `⚠️ Paiements en retard ?` · `📊 Top clients du trimestre` |
| `/dashboard/clients/[id]` | `📈 Historique de ce client` · `✉️ Rédiger une relance` · `➕ Nouvelle commission` |
| `/dashboard/invoices` | `🧾 Nouvelle facture` · `💡 Marquer les factures de mars comme payées` |
| `/dashboard/workspace` (tiroir ouvert) | `✉️ Reformuler plus pro` · `💡 Suggérer un objet` · `🔍 Corriger le ton` |
| `/dashboard/workspace` (tiroir fermé) | `🔍 Trouver un fichier Drive` · `✉️ Composer un email` |
| Autre | Fallback générique : `💡 Résume-moi ce mois` · `⚠️ Que dois-je traiter en priorité ?` |

---

## 10. Garanties de non-régression

- **Signature LR Consulting** — `/api/email/send` reste strictement inchangé
- **Auth** — toutes les routes agent gardent `getSessionUser()` en guard
- **Historique existant** — les messages `agent_messages` restent lisibles tels quels dans le widget
- **Confirmations DB** — aucune action d'écriture DB sans validation utilisateur explicite (Option B stricte)
- **Workspace** — le tiroir email continue de fonctionner, coexiste sans conflit avec le panneau Reem
- **Activity log** — toute action effectuée via Reem est loggée avec `source: 'via Reem AI'`
- **Zod validation** — inputs API agent restent validés, nouveaux tools d'action ajoutent leurs schémas

---

## 11. Vérification

### 11.1 Tests Vitest à ajouter

- `__tests__/hooks/useReemUIPersistence.test.tsx` — 5 tests (init, restauration, debounce, données corrompues, clear)
- `__tests__/lib/reem-suggestions.test.ts` — 4 tests (matching exact, préfixe client, fallback, context-aware workspace)
- `__tests__/api/agent-insights.test.ts` — 3 tests (auth guard, parsing LLM response valide, fallback si LLM échoue)
- `__tests__/lib/agent-tools.test.ts` — 6 tests (query_data routing, pending_action shape pour chaque manage_*)

### 11.2 Checklist manuelle

- [ ] Bulle visible sur toutes les pages du dashboard
- [ ] `⌘L` cycle : masqué → bulle → panneau → bulle
- [ ] Escape referme le panneau
- [ ] Navigation entre pages préserve état et brouillon
- [ ] Suggestions changent selon la page courante
- [ ] `draft_email` ouvre le tiroir Workspace pré-rempli
- [ ] `propose_navigation` affiche un chip cliquable, pas de navigation auto
- [ ] `create_commission` via Reem : carte pending → clic Accepter → ligne créée en DB + activity_log
- [ ] `manage_client` toutes variantes (create, rename, pin, unpin, delete) fonctionnent avec confirmation
- [ ] `manage_invoice` toutes variantes fonctionnent
- [ ] `manage_drive` toutes variantes fonctionnent
- [ ] `post_chat_message` poste réellement dans le canal après confirmation
- [ ] Multi-étapes : une demande « rédige 3 relances » produit 3 cartes pending distinctes, acceptées individuellement
- [ ] `/dashboard/agent` → 404
- [ ] Sidebar n'a plus l'entrée « Reem AI »
- [ ] `<ReemInsights />` visible en bas du dashboard, 0-3 cartes, discret
- [ ] Clic sur une carte insight → ouvre Reem avec prompt pré-envoyé
- [ ] Pull-tab visible quand masqué, restaure la bulle au clic
- [ ] Email envoyé via Reem contient la signature LR Consulting
- [ ] Coexistence Workspace : panneau Reem visible simultanément avec tiroir email
- [ ] Design system respecté (couleurs, rayons, typographie tous conformes)

### 11.3 Discipline à chaque task

`npm run lint && npx tsc --noEmit && npm run build && npm test` doit passer. Sous-agent reviewer après chaque étape majeure (cohérence, props, imports, régressions).

---

## 12. Hors scope

- Streaming SSE des réponses LLM (on garde requête/réponse unique)
- Vocal in/out
- Multi-conversation en parallèle (une conversation active, historique = read-only)
- Personnalisation des insights (cacher/réordonner)
- Recherche texte dans l'historique
- Upload de fichiers directement dans le chat Reem (on passe par le Workspace)
- Optimisation mobile poussée (le widget est plein écran sous 768px, pas de fine-tuning tactile)

---

## 13. Critères de succès

1. Les 3 états du widget fonctionnent et persistent entre navigations et refresh
2. `⌘L` fait le cycle à 3 états sans bug
3. Les 13 tools répondent correctement, les 7 tools d'action produisent des cartes `pending_action` et s'exécutent seulement après Accepter
4. Un email de relance généré par Reem ouvre le tiroir Workspace pré-rempli, la signature LR Consulting est présente à l'envoi
5. Les insights sur le dashboard sont générés par LLM, max 3 cartes, actionnables, cachés 10min
6. `/dashboard/agent` supprimé, sidebar nettoyée, aucun lien cassé
7. `npm run lint && npx tsc --noEmit && npm run build && npm test` verts
8. Checklist manuelle section 11.2 passée intégralement
9. Sous-agent code-reviewer final sans remontée critique
