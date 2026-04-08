# Reem AI — Widget flottant contextuel

**Date :** 2026-04-08
**Auteur :** Hugues-Henri (collab Claude)
**Statut :** Spec validée, en attente de plan d'implémentation

---

## 1. Contexte & motivation

Aujourd'hui, Reem AI existe en tant que page dédiée `/dashboard/agent` avec une interface chat complète et 9 outils LLM. En pratique, l'agent est **peu utilisé** parce qu'il souffre de trois défauts majeurs :

1. **Isolé du flux de travail.** Pour lui parler, il faut quitter la page courante, cliquer sur « Reem AI » dans la sidebar, poser la question, puis revenir. Le coût cognitif du switch d'onglet dissuade l'usage pour toute tâche rapide.
2. **Duplique des fonctionnalités existantes.** Les 5 outils de lecture (`query_commissions`, `query_paiements`, `query_clients`, `query_sommes_dues`, `query_activity`) affichent des données qui sont déjà accessibles en 1 clic via le dashboard, les pages client ou facturation — avec des tableaux triables et filtrables plus ergonomiques que le chat.
3. **Pas de valeur ajoutée IA distinctive.** Reem répond à des requêtes bien formulées, mais ne propose rien, n'alerte pas, ne rédige rien spontanément, et n'a aucune conscience du contexte (quelle page tu regardes, quel client est sélectionné, quel brouillon est en cours).

### Objectif

Refondre Reem AI en un **widget flottant contextuel** présent partout dans l'app, avec 3 états (masqué / bulle / panneau ouvert), des suggestions adaptées à la page courante, une refonte des tools pour concentrer la valeur LLM sur ce que l'IA fait mieux que l'humain (rédaction, synthèse, actions pré-remplies), et une section d'insights proactifs sur le dashboard principal.

---

## 2. Approche retenue

**Un widget flottant en position fixe**, accessible depuis toutes les pages du dashboard, avec trois états utilisateur et persistance de l'état entre les sessions.

### Les 3 états du widget

| État | Visuel | Déclencheurs |
|---|---|---|
| **Masqué** | Une petite languette verticale (22×60px, indigo discret) collée au bord droit de l'écran, verticalement centrée. | Transition depuis « Panneau ouvert » ou « Bulle » via bouton « Masquer » OU raccourci `⌘J`. |
| **Bulle** | Une bulle ronde de 54px en bas-droite, dégradé indigo + petit point vert indiquant « en ligne ». | État par défaut au premier chargement. Transition depuis « Masqué » (clic pull-tab) ou depuis « Panneau ouvert » (✕). |
| **Panneau ouvert** | Un panneau flottant 380×540px ancré en bas-droite, superposé au contenu de la page. | Clic sur la bulle OU raccourci `⌘J`. |

### Les 3 directions de refonte combinées

Cette refonte applique les trois axes d'amélioration stratégiques identifiés lors du brainstorming :

- **Direction A — Intégration contextuelle** : le widget est partout dans l'app, il connaît la page courante, il est appelable sans quitter son flux de travail.
- **Direction B — Proactivité** : un encart « Insights » sur le dashboard principal qui affiche automatiquement 3-5 signaux utiles au chargement (paiements en retard, retours clients, suggestions d'actions). Asynchrone, non-bloquant.
- **Direction C — Focus sur les vrais cas d'usage IA** : suppression des tools de lecture peu utiles, concentration sur 3-4 tools à forte valeur ajoutée (rédaction d'emails, synthèse, actions pré-remplies vers les UIs existantes).

---

## 3. Détail du fonctionnement utilisateur

### 3.1 Premier chargement

Tu arrives sur Commission Tracker (n'importe quelle page). Reem est en état **Bulle** par défaut : une bulle ronde 54px en bas-droite, visible, stable au scroll et à la navigation. Un point vert en haut-droite indique « en ligne / disponible ».

### 3.2 Ouvrir le panneau (bulle → panneau)

Clic sur la bulle :
- Transition 200ms : la bulle s'efface (scale + fade-out), le panneau apparaît avec un slide-up + fade-in depuis le coin bas-droite
- Panneau fixé à 20px du bord droit et 20px du bord bas
- Dimensions : 380px de large × 540px de haut (responsive : plein écran sous 768px)
- Le reste de la page reste cliquable (panneau non bloquant, pas de backdrop)

**Contenu du panneau (haut → bas) :**

- **Header** (48px) : point pulsé vert + « Reem AI » + petit texte gris indiquant le contexte courant (ex: « contexte : Dashboard » ou « contexte : ECODISTRIB »). À droite : 3 boutons icônes — « Historique » (📋), « Masquer complètement » (👁️ barré), « Fermer le panneau » (✕).
- **Corps** (flex 1, scrollable) : messages de la conversation + **suggestions contextuelles** (chips cliquables) affichées tant que le user n'a rien écrit.
- **Input bar** (56px) : textarea une ligne + bouton envoyer + indicateur de sending.

### 3.3 Fermer le panneau (panneau → bulle)

Clic sur ✕ du panneau ou appui sur Escape :
- Transition inverse : le panneau disparaît (slide-down + fade), la bulle revient
- **Le brouillon de message** (texte dans l'input non envoyé) est **préservé** en mémoire — il réapparaît si tu rouvres
- **L'historique de conversation** est bien sûr conservé (stocké en base Supabase)

### 3.4 Masquer Reem complètement (bulle ou panneau → masqué)

Clic sur le bouton « Masquer » (👁️ barré) dans le header du panneau, OU clic-droit sur la bulle → menu contextuel « Masquer Reem », OU raccourci `⌘J` depuis l'état « Bulle » (alors que le panneau n'est pas ouvert).

Transition :
- La bulle/panneau disparaît (fade-out)
- Une **pull-tab** apparaît collée au bord droit de l'écran, verticalement centrée à 50% de hauteur. Dimensions : 22px de large × 60px de haut. Couleur `rgba(99,102,241,0.18)` avec bordure gauche `rgba(99,102,241,0.4)`. Contenu : petite icône Reem (simple lettre « R » ou logo) + une flèche `‹` indiquant « tire-moi »
- La pull-tab est `position: fixed`, `z-index: 40`, au-dessus du sidebar et du contenu

### 3.5 Ressortir Reem (masqué → bulle)

Clic sur la pull-tab OU raccourci `⌘J` :
- La pull-tab disparaît (fade)
- La bulle revient dans le coin bas-droite (scale-in)
- Reem redevient disponible normalement

### 3.6 Raccourci clavier `⌘J` / `Ctrl+J`

Le raccourci est **global** et fait cycler intelligemment :

| État actuel | `⌘J` fait... |
|---|---|
| Masqué | → Bulle visible |
| Bulle | → Panneau ouvert (auto-focus sur l'input) |
| Panneau ouvert | → Panneau fermé (bulle visible) |

### 3.7 Navigation entre les pages

Quand l'utilisateur navigue (`/dashboard` → `/dashboard/clients/xxx` → `/dashboard/workspace`) :
- **L'état de Reem est préservé à 100%** : visibilité, état ouvert/fermé, brouillon de message, conversation en cours
- **Le contexte se met à jour** automatiquement : le label du header et les suggestions changent pour refléter la nouvelle page
- **Aucun remontage du composant** : le widget est monté au niveau du layout global, les transitions de route ne le détruisent pas

### 3.8 Coexistence avec le tiroir email du Workspace

Sur `/dashboard/workspace`, le tiroir email peut être ouvert à droite pleine hauteur (460px). Le panneau Reem (380×540, ancré en bas-droite) **coexiste sans conflit** :
- Le panneau Reem flotte au-dessus du bord bas du tiroir email
- Les deux peuvent être ouverts simultanément
- C'est un cas d'usage intentionnel : tu peux demander à Reem de t'aider à rédiger l'email en cours dans le tiroir (Reem voit le contexte « tu es dans le Workspace avec un brouillon en cours »)

### 3.9 Persistance de l'état

L'état du widget est persisté dans `localStorage["reem.ui"]` :

```typescript
interface ReemUIState {
  visibility: 'bubble' | 'hidden' | 'panel-open'
  draftMessage: string  // texte en cours dans l'input (non envoyé)
}
```

Lecture au montage, écriture à chaque changement avec un debounce 300ms. Si indisponible (navigation privée, quota), fallback silencieux en mémoire seulement.

---

## 4. Contextual awareness — Comment Reem connaît la page courante

### 4.1 Contexte transmis au backend

À chaque message envoyé, le frontend enrichit la requête avec un objet `context` :

```typescript
interface ReemContext {
  pathname: string              // ex: "/dashboard/clients/ecodistrib-id"
  pageLabel: string             // ex: "ECODISTRIB" (dérivé pour affichage lisible)
  clientId: string | null       // client actif du useClientContext existant
  selectedEntity?: {            // entité en cours d'édition ou de consultation
    type: 'client' | 'commission' | 'paiement' | 'invoice' | 'email_draft'
    id?: string
    preview?: string            // ex: résumé du brouillon email en cours
  }
}
```

Le contexte est capturé par un **hook `useReemContext()`** qui lit `usePathname()` de Next.js + le `useClientContext()` existant + éventuellement des props de page (dans le Workspace, la page passe son `draft` courant dans un provider).

### 4.2 Injection dans le prompt système

Le backend (`/api/agent/chat`) reçoit le `context` dans la requête et l'injecte dans le prompt système de l'appel Anthropic :

```
Tu es Reem AI, l'assistante intelligente de LR Consulting W.L.L...

Contexte utilisateur courant :
- Page : {pageLabel} ({pathname})
- Client actif : {clientName ?? "aucun"}
- {selectedEntity ? `Entité en cours : ${type} "${preview}"` : ""}

Prends ce contexte en compte pour répondre. Quand l'utilisateur dit "ce client", "cette
facture", "ce mail", réfère-toi à l'entité en cours.
```

Le contexte est **également passé aux tools** via `AgentContext` (déjà existant, on ajoute `pageContext` à la structure).

### 4.3 Suggestions contextuelles (chips)

Les suggestions affichées dans le panneau tant que le user n'a rien écrit dépendent du `pathname` :

| Pattern pathname | Suggestions proposées |
|---|---|
| `/dashboard` (racine) | 💡 Résume-moi ce mois · ⚠️ Paiements en retard — rédiger les relances · 📊 Top clients du trimestre |
| `/dashboard/clients` ou `/dashboard/clients/[id]` | 📈 Historique de ce client · ✉️ Rédiger une relance · ➕ Nouvelle commission pour ce client |
| `/dashboard/invoices` | 🧾 Nouvelle facture pour ce client · 💡 Générer un libellé pro |
| `/dashboard/workspace` (tiroir email ouvert) | ✉️ Reformuler plus professionnel · 💡 Suggérer un objet · 🔍 Corriger le ton |
| `/dashboard/workspace` (tiroir fermé) | 🔍 Trouver un fichier dans Drive · ✉️ Composer un email |
| `/dashboard/chat` | (aucune suggestion — Reem n'est pas utile ici, on peut même la masquer) |

Les suggestions sont un dictionnaire simple `Record<string, string[]>` défini côté frontend dans un fichier `lib/reem-suggestions.ts` avec une fonction `getSuggestions(pathname, context)`.

---

## 5. Refonte des tools (Direction C)

### 5.1 Tools supprimés

Les 5 tools de lecture suivants sont **supprimés** parce qu'ils dupliquent des données déjà accessibles via l'UI en 1 clic avec des tableaux plus ergonomiques :

- `query_commissions` — les commissions sont filtrables/triables dans `/dashboard`
- `query_paiements` — idem
- `query_sommes_dues` — idem
- `query_clients` — la liste est dans `/dashboard/clients`
- `query_activity` — l'activity log est visible dans la sidebar

### 5.2 Tools conservés et enrichis

Les 2 tools d'action existants sont **conservés** mais leur UX change : au lieu de retourner un JSON de confirmation dans le chat, ils déclenchent l'ouverture des formulaires existants **pré-remplis**.

- `create_commission` → au lieu d'un bloc confirm dans le chat, Reem répond « Je t'ai préparé cette commission, clique pour la créer » avec un bouton qui navigue vers `/dashboard?newCommission={data}` et la page dashboard détecte le query param et ouvre la modale de création avec tous les champs pré-remplis.
- `create_paiement` → même logique, redirige vers le formulaire de paiement pré-rempli.
- `draft_email` → existe déjà, redirige vers `/dashboard/workspace?to=X&subject=Y&body=Z` qui ouvre le tiroir email avec le brouillon pré-rempli (déjà implémenté dans le merge Workspace).
- `search_drive` → conservé tel quel, utile pour la recherche par nom de fichier.

### 5.3 Tools ajoutés (nouveau)

Trois nouveaux tools à haute valeur ajoutée sont ajoutés :

#### `get_overdue_payments`
Retourne les paiements dont le statut est `en_retard` ou `en_attente` depuis plus de 30 jours, triés par ancienneté. Utilisé par Reem pour répondre aux questions « quels retards ? » et pour alimenter les suggestions.

```typescript
{
  name: 'get_overdue_payments',
  description: 'Récupérer les paiements en retard (statut en_retard ou en_attente depuis >30j). Retourne les infos nécessaires pour rédiger des relances.',
  input_schema: {
    type: 'object',
    properties: {
      threshold_days: { type: 'number', description: 'Seuil en jours (défaut 30)' },
      client_id: { type: 'string', description: 'Filtrer par client (optionnel)' },
    },
    required: [],
  },
}
```

#### `summarize_period`
Synthèse narrative d'une période : nombre de commissions, CA total, paiements reçus, paiements en retard, tendances vs mois précédent.

```typescript
{
  name: 'summarize_period',
  description: 'Générer un résumé narratif d\'une période (commissions, paiements, CA, tendances). Utilise cet outil pour "résume-moi le mois" ou "que s\'est-il passé cette semaine".',
  input_schema: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['week', 'month', 'quarter'], description: 'Période à résumer' },
      client_id: { type: 'string', description: 'Filtrer par client (optionnel)' },
    },
    required: ['period'],
  },
}
```

#### `generate_relance_email`
Génère un brouillon d'email de relance pour un paiement en retard, avec ton professionnel, montant, échéance, et signature LR Consulting. Le résultat ouvre le tiroir Workspace pré-rempli.

```typescript
{
  name: 'generate_relance_email',
  description: 'Générer un email de relance professionnel pour un paiement en retard. Utilise le nom du client, le montant dû, la date d\'échéance, et un ton cordial mais ferme.',
  input_schema: {
    type: 'object',
    properties: {
      client_id: { type: 'string', description: 'Client concerné' },
      paiement_id: { type: 'string', description: 'Paiement en retard (optionnel, si null on prend tous les retards du client)' },
    },
    required: ['client_id'],
  },
}
```

### 5.4 Total tools après refonte

**Avant :** 9 tools (5 lecture + 2 création + search_drive + draft_email)
**Après :** 7 tools (create_commission, create_paiement, search_drive, draft_email, get_overdue_payments, summarize_period, generate_relance_email)

Net : −2 tools mais +3 tools à haute valeur et suppression du bruit. Plus simple pour l'LLM à orchestrer, plus utile pour l'utilisateur.

---

## 6. Insights proactifs sur le dashboard (Direction B)

### 6.1 Où et quand

Un encart **« Reem Insights »** ajouté en haut de `/dashboard` (au-dessus des KPIs existants), chargé de façon asynchrone après le mount de la page. Non-bloquant : le dashboard s'affiche instantanément, les insights apparaissent dans les 1-2 secondes suivantes avec un fade-in.

### 6.2 Contenu

Maximum **3 insights** affichés sous forme de cartes compactes horizontales :

1. **Paiements en retard critiques** (si ≥1 paiement >30j) : « 3 paiements en retard depuis >30 jours (total : 12 400 €). Rédiger les relances ? » → bouton « Oui, rédiger »
2. **Activité inhabituelle** (si aucune commission créée ce mois alors que l'habitude est d'en créer X) : « Tu n'as créé aucune commission ce mois pour ECODISTRIB (habituel : 2/mois). Tout va bien ? »
3. **Synthèse hebdomadaire** (si pas vue depuis 7 jours) : « Cette semaine : 3 nouvelles commissions, 8 400 € de CA, 2 paiements reçus. » → bouton « Détails »

Les boutons lancent une requête Reem prédéfinie qui ouvre le panneau du widget avec la réponse pré-chargée.

### 6.3 Backend

Les insights sont calculés côté backend par une nouvelle route **`GET /api/agent/insights`** qui :
1. Lit `commissions`, `paiements`, `sommes_dues` de l'utilisateur
2. Applique des règles métier simples (pas de LLM à ce stade — règles codées en dur pour vitesse + prédictibilité)
3. Retourne un tableau d'insights typés

```typescript
interface Insight {
  id: string
  severity: 'info' | 'warning' | 'alert'
  icon: string
  title: string
  description: string
  actionLabel?: string
  actionPrompt?: string  // ce que le widget Reem enverra si le user clique
}
```

Le composant frontend `<ReemInsights />` appelle cette route au mount de `/dashboard` et affiche le résultat.

### 6.4 Hors scope

- Pas de notifications push ou d'alertes en dehors de cet encart dashboard
- Pas d'insights calculés en temps réel (on recalcule à chaque refresh)
- Pas de personnalisation utilisateur (pas d'API pour cacher un insight)

---

## 7. Suppression de `/dashboard/agent`

La page dédiée est **entièrement supprimée** une fois le widget en place :

- `app/dashboard/agent/page.tsx` → supprimé
- `app/dashboard/agent/loading.tsx` → supprimé
- L'entrée « Reem AI » dans la sidebar (`NAV_ITEMS` de `Sidebar.tsx`) → supprimée
- L'icône correspondante dans `NAV_ICONS` → supprimée
- Pas de redirect Next.js (la route disparaît simplement, les liens externes qui pointaient là sont négligeables — il n'y en a pas à ma connaissance)

**L'historique de conversation reste accessible** dans le widget via le bouton « 📋 Historique » du header du panneau. Ce bouton bascule le corps du panneau sur une vue liste des conversations passées (groupées par date : Aujourd'hui / Hier / Cette semaine / Plus ancien), avec un bouton « Nouveau chat » pour repartir à zéro. Cette vue historique réutilise la même API `agent_messages` de Supabase.

Les composants existants `AgentMessage.tsx` et `AgentInput.tsx` sont **réutilisés à l'identique** dans le panneau flottant — ils affichent déjà correctement les messages, les data cards, les confirm blocks et les email cards. Seul le layout parent change.

---

## 8. Composants & architecture

### Arbre de composants

```
app/layout.tsx (ou app/dashboard/layout.tsx)
├── {children}                                    ← page courante
└── <ReemWidget />                                 ← NOUVEAU, monté globalement
    ├── état interne : visibility, panelState
    ├── hook : useReemContext() (pathname, client, entity)
    ├── hook : useReemUIPersistence() (localStorage + debounce)
    │
    ├── { visibility === 'hidden' }
    │   └── <ReemPullTab onClick={show} />
    │
    ├── { visibility === 'bubble' }
    │   └── <ReemBubble onClick={openPanel} onHide={hide} />
    │
    └── { visibility === 'panel-open' }
        └── <ReemPanel
              onClose={closeToBubble}
              onHide={hide}
              context={useReemContext()} >
              ├── <ReemHeader context={} onHistory onHide onClose />
              ├── <ReemBody>
              │   ├── <ReemSuggestions pathname={} /> (si pas de messages récents)
              │   └── <ReemMessages> (réutilise AgentMessage)
              ├── <ReemInput /> (réutilise AgentInput)
              └── <ReemHistoryView /> (affiché à la place de Body si mode historique)
```

### Fichiers à créer

| Path | Responsabilité |
|---|---|
| `components/reem/ReemWidget.tsx` | Orchestrateur : gère les 3 états, le raccourci clavier, les transitions |
| `components/reem/ReemBubble.tsx` | La bulle 54px en bas-droite |
| `components/reem/ReemPullTab.tsx` | La languette 22×60px sur le bord droit |
| `components/reem/ReemPanel.tsx` | Le panneau flottant 380×540 |
| `components/reem/ReemHeader.tsx` | Header du panneau avec contexte et boutons |
| `components/reem/ReemSuggestions.tsx` | Chips de suggestions contextuelles |
| `components/reem/ReemHistoryView.tsx` | Vue historique des conversations |
| `components/reem/ReemInsights.tsx` | Encart insights sur le dashboard |
| `hooks/useReemContext.ts` | Calcule le contexte courant (pathname, client, entity) |
| `hooks/useReemUIPersistence.ts` | State `{visibility, draftMessage}` persisté en localStorage |
| `lib/reem-suggestions.ts` | Dictionnaire `getSuggestions(pathname, context)` |
| `app/api/agent/insights/route.ts` | GET : calcule et retourne les insights du dashboard |

### Fichiers à modifier

| Path | Modification |
|---|---|
| `app/dashboard/layout.tsx` | Ajouter `<ReemWidget />` en fin de layout (après `{children}`) |
| `app/api/agent/chat/route.ts` | Accepter un nouveau champ `context: ReemContext` dans le body. L'injecter dans le prompt système ET dans `AgentContext`. |
| `lib/agent-tools.ts` | Supprimer les 5 tools de lecture. Ajouter `get_overdue_payments`, `summarize_period`, `generate_relance_email`. Étendre `AgentContext` avec `pageContext`. |
| `hooks/useAgentMessages.ts` | `sendMessage` accepte un nouveau param `context: ReemContext` et le transmet au POST `/api/agent/chat`. |
| `components/agent/AgentMessage.tsx` | Réutilisé tel quel dans `ReemPanel`. Petits ajustements si besoin pour le rendu compact (largeur max). |
| `components/agent/AgentInput.tsx` | Réutilisé. Le brouillon interne devient contrôlé (props depuis `useReemUIPersistence`). |
| `components/layout/Sidebar.tsx` | Supprimer l'entrée « Reem AI » et son icône. |
| `app/dashboard/page.tsx` | Ajouter `<ReemInsights />` en haut de la page. |

### Fichiers à supprimer

| Path | Raison |
|---|---|
| `app/dashboard/agent/page.tsx` | Remplacé par le widget flottant global |
| `app/dashboard/agent/loading.tsx` | La page disparaît |

---

## 9. Design system & cohérence visuelle

### Tokens utilisés

Strictement les tokens du projet (`CLAUDE.md` du projet) :

- **Backgrounds** : `#07080d` (page), `#0f1117` (panneau Reem), `#151a24` (éléments élevés)
- **Texte** : `#e8edf5` (principal), `#8898aa` (secondaire), `#3d4f63` (tertiaire)
- **Accent principal** : `#6366f1` (indigo) → `#818cf8` (indigo clair) pour les gradients
- **Status** : `#22c55e` (en ligne / success), `#f59e0b` (warning), `#f43f5e` (erreur)
- **Rayons** : 14px pour le panneau, 8px pour les boutons internes, 50% pour la bulle
- **Transitions** : 200ms ease-out cohérent avec les autres animations du projet (tiroir Workspace)

### Z-index strategy

```
100 — toast notifications (déjà existant)
 50 — panneau Reem (au-dessus du contenu, au-dessus du tiroir Workspace)
 40 — bulle Reem / pull-tab
 30 — tiroir email du Workspace
 20 — modales existantes (createPortal)
```

### Accessibilité

- Toutes les interactions clavier : `Escape` ferme le panneau, `⌘J` toggle, `Tab` navigation dans les suggestions et input
- `aria-label` sur tous les boutons (bulle, pull-tab, masquer, fermer, historique)
- `role="dialog"` + `aria-labelledby` sur le panneau
- Focus trap dans le panneau quand il est ouvert (optional nice-to-have)
- Respect de `prefers-reduced-motion` : transitions raccourcies à 0ms si préférence utilisateur

---

## 10. Gestion d'erreurs

| Cas | Comportement |
|---|---|
| Clé API Anthropic manquante | Le panneau affiche un message d'erreur métier « Reem est temporairement indisponible » + bouton retry |
| Requête réseau échoue | Message « Erreur réseau, réessayer » dans le chat, le message utilisateur reste affiché |
| LocalStorage indisponible | Fallback en mémoire, le widget reste fonctionnel, état non persisté à refresh |
| Insights API échoue | L'encart `<ReemInsights />` affiche discrètement « Impossible de charger les insights » ou se masque complètement |
| Tool LLM retourne une erreur | Message d'erreur dans le chat, historique préservé |
| Restauration d'un état corrompu depuis localStorage | Validation `isReemUIStateLike()`, fallback à l'état par défaut (bulle visible) |

---

## 11. Non-régression — Garanties explicites

- ✅ **Signature LR Consulting** : inchangée, toujours appliquée côté serveur dans `/api/email/send`
- ✅ **Historique existant** : les messages déjà stockés dans `agent_messages` sont visibles dans le widget (format inchangé)
- ✅ **Confirmation actions** : le flux `create_commission` / `create_paiement` continue à demander confirmation explicite avant insertion DB
- ✅ **Auth** : toutes les routes API continuent d'utiliser `getSessionUser()` comme guard
- ✅ **Validation Zod** : préservée sur toutes les routes modifiées
- ✅ **Activity log** : les actions créées via Reem continuent d'être loggées avec `source: 'via Reem AI'`
- ✅ **Workspace** : le tiroir email continue de fonctionner, coexiste avec le panneau Reem sans conflit
- ✅ **Sidebar** : seule l'entrée « Reem AI » disparaît, les autres sont intactes

---

## 12. Stratégie de vérification

### Tests automatisés à ajouter

- `__tests__/hooks/useReemUIPersistence.test.tsx` : 5 tests (init par défaut, restauration, persistance debounced, validation données corrompues, clear)
- `__tests__/lib/reem-suggestions.test.ts` : 4 tests (matching pathname pour chaque grande famille de pages + fallback)
- `__tests__/api/agent-insights.test.ts` : 3 tests (route auth, calcul des insights sur fixtures, retour vide si aucun signal)

### Discipline de vérification systématique

À chaque task : `npm run lint && npx tsc --noEmit && npm run build && npm test` — tous doivent passer.

Sous-agent reviewer après chaque étape majeure : audit des imports, props, comportements régressés, intégration cohérente.

### Tests fonctionnels manuels (checklist)

- [ ] Bulle visible en bas-droite sur toutes les pages du dashboard
- [ ] Clic bulle ouvre le panneau avec animation fluide
- [ ] Le header du panneau affiche le bon contexte selon la page
- [ ] Les suggestions changent selon la page (dashboard, client, workspace, factures)
- [ ] Clic ✕ referme le panneau, bulle revient
- [ ] Clic sur bouton « Masquer » → pull-tab apparaît à droite
- [ ] Clic pull-tab → bulle revient
- [ ] `⌘J` depuis l'état masqué → bulle apparaît
- [ ] `⌘J` depuis la bulle → panneau s'ouvre avec focus input
- [ ] `⌘J` depuis panneau ouvert → panneau se referme
- [ ] Navigation entre pages préserve l'état du widget et le brouillon
- [ ] Refresh navigateur préserve l'état visibility
- [ ] Suggestion contextuelle cliquée → envoie le message correspondant
- [ ] Bouton Historique → affiche la liste des conversations passées
- [ ] Nouveau chat depuis l'historique → vide la conversation
- [ ] Envoi d'un message texte → réponse reçue avec signature préservée
- [ ] Tool `generate_relance_email` → ouvre le tiroir Workspace pré-rempli
- [ ] Tool `summarize_period` → retourne un résumé narratif en français
- [ ] Tool `create_commission` → bouton vers formulaire pré-rempli (pas JSON brut)
- [ ] Sidebar : plus d'entrée « Reem AI »
- [ ] Page `/dashboard/agent` → 404 (supprimée)
- [ ] Encart `<ReemInsights />` visible sur `/dashboard`, affiche 0-3 signaux selon les données
- [ ] Clic action d'un insight → ouvre le panneau Reem avec la requête pré-chargée
- [ ] Coexistence Workspace : panneau Reem visible en même temps que le tiroir email
- [ ] Panneau Reem respecte le design system (couleurs, rayons, typographie)

---

## 13. Hors scope (explicitement non inclus)

- **Streaming des réponses LLM** (pas de SSE, on garde la requête/réponse unique comme aujourd'hui)
- **Vocal in/out** (pas de speech-to-text ou text-to-speech)
- **Multi-conversation en parallèle** (une seule conversation active, historique = archives read-only)
- **Personnalisation des insights** (pas d'API pour cacher ou réordonner)
- **Notifications push / email** pour les insights (uniquement affichage dashboard)
- **Partage de conversation** (pas d'export ni de lien public)
- **Recherche dans l'historique** (on liste par date, pas de recherche texte)
- **Upload de fichiers dans le chat Reem** (pour joindre un fichier à analyser, on passe par le Workspace)
- **Mobile natif** (le widget fonctionne sur mobile en mode plein écran mais n'est pas optimisé tactile poussé)

---

## 14. Risques & mitigations

| Risque | Probabilité | Mitigation |
|---|---|---|
| Le contexte LLM devient trop verbeux et mange les tokens | Moyenne | Limite le `pageContext` à 3-4 champs concis ; le history est déjà limité à 30 messages |
| Le widget gêne visuellement sur petites résolutions | Moyenne | Responsive : plein écran sous 768px, panneau 320px entre 768–1024px |
| Les insights dashboard deviennent intrusifs ou obsolètes | Faible | Maximum 3 cartes, seuils clairs, possibilité de les cacher si l'encart est vide |
| La persistance du brouillon cause des confusions (ancien message oublié) | Faible | Le brouillon est clairement affiché à la réouverture ; on peut ajouter un « Effacer le brouillon » mineur si besoin |
| La page `/dashboard/agent` est supprimée mais un lien externe pointe dessus | Très faible | Elle n'est référencée nulle part ailleurs que dans le sidebar (que l'on modifie). Un 404 standard Next.js est acceptable vu l'usage interne. |
| Refonte des tools casse des conversations passées | Faible | Les anciennes conversations stockées ne sont jamais re-exécutées, elles sont juste affichées. Les tools supprimés apparaîtront comme des data cards historiques intactes. |
| Cost LLM augmente avec le contexte enrichi et les nouveaux tools | Faible | La taille de `context` est bornée (<500 tokens). Les nouveaux tools sont plus ciblés donc moins de round-trips LLM. Net neutre ou positif. |

---

## 15. Critères de succès

Le refactor est considéré comme réussi si **tous** les points suivants sont vérifiés :

1. ✅ Le widget est fonctionnel dans les 3 états sur toutes les pages du dashboard
2. ✅ La navigation entre pages préserve l'état et met à jour le contexte
3. ✅ `⌘J` fonctionne comme décrit (toggle 3-états)
4. ✅ L'historique des conversations est accessible via le bouton du header
5. ✅ La page `/dashboard/agent` est supprimée, 404 sur la route
6. ✅ L'entrée « Reem AI » a disparu du sidebar
7. ✅ Les nouveaux tools (`get_overdue_payments`, `summarize_period`, `generate_relance_email`) répondent correctement
8. ✅ Les tools supprimés ne sont plus appelables (erreur « outil inconnu » si le LLM tente)
9. ✅ L'encart `<ReemInsights />` est présent sur le dashboard et affiche 0-3 signaux
10. ✅ Un email de relance généré par `generate_relance_email` ouvre le tiroir Workspace pré-rempli
11. ✅ `npm run lint && npx tsc --noEmit && npm run build && npm test` passent sans erreur
12. ✅ Les tests manuels de la section 12 passent tous
13. ✅ Aucune régression sur l'envoi d'email (signature LR Consulting préservée)
14. ✅ Le sous-agent code-reviewer ne signale aucun problème sur les fichiers touchés
