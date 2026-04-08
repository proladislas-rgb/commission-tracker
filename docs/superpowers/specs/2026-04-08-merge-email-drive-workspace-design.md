# Workspace — Fusion Drive + Email

**Date :** 2026-04-08
**Auteur :** Hugues-Henri (collab Claude)
**Statut :** Spec validée, en attente de plan d'implémentation

---

## 1. Contexte & motivation

Aujourd'hui, l'application a deux onglets distincts dans le sidebar :

- **`/dashboard/drive`** — explorateur Google Drive (browse, upload, download, delete)
- **`/dashboard/email`** — composeur Gmail (texte + pièces jointes Drive ou locales)

Les deux fonctionnent sur les mêmes credentials OAuth Google et ont chacun leur propre check de connexion (code dupliqué). Plus de 80% des emails envoyés contiennent au moins une pièce jointe Drive — l'email est de fait un canal de transport pour les fichiers Drive.

### Frictions concrètes identifiées

| # | Friction | Conséquence |
|---|---|---|
| A | Switch constant entre les deux onglets | Casse le rythme de travail |
| B | Sidebar encombré (deux entrées Google) | Redondance perçue, charge cognitive |
| C | Drive → Email perd le contexte | Impossible de garder Drive en vue pendant la rédaction |
| D | Email → Drive perd le brouillon | **Bug** : sortir du composeur efface tout (état non persistant) |

### Objectif

Fusionner les deux fonctionnalités dans une seule page **Workspace** qui :
- Garde les deux usages à parts égales (utilisation 50/50 réelle)
- Permet de composer un email (avec ou sans pièce jointe) et de naviguer dans Drive **simultanément**
- Persiste le brouillon en cours, y compris après refresh navigateur
- Préserve toutes les fonctionnalités existantes (signature auto, query params Reem AI, OAuth, activity_log)

---

## 2. Approche retenue : Workspace split avec tiroir Email

Une seule page `/dashboard/workspace`. L'explorateur Drive occupe par défaut toute la surface. Un bouton **« + Nouveau mail »** dans le header ouvre un **tiroir** (panneau latéral à droite, 460px) contenant le composeur d'email. Le tiroir reste ouvert pendant qu'on navigue dans Drive ; au survol d'un fichier, un bouton « 📎 Joindre » remplace l'icône de download (visible uniquement quand le tiroir est ouvert).

### Pourquoi cette approche

- Résout les **4 frictions** (A, B, C, D) sans dégrader d'autres cas
- Préserve le mode « email pur » pour les ~20% de mails sans pièce jointe (le tiroir s'ouvre vide)
- Le tiroir n'étant jamais démonté pendant la session, l'état du brouillon survit naturellement ; un miroir localStorage le fait survivre aux refresh
- Pattern connu (Gmail, Linear) — pas d'apprentissage utilisateur nécessaire

### Approches écartées

- **Onglets internes** dans une page unifiée — résout B mais pas A/C/D ; cosmétique
- **Drive-first avec modale d'envoi** — bloque le multitâche, dégrade les emails purs

---

## 3. Architecture & composants

### Routes

| Route | Avant | Après |
|---|---|---|
| `/dashboard/workspace` | n'existe pas | **nouvelle page** |
| `/dashboard/drive` | page complète | **redirect 308** vers `/dashboard/workspace` |
| `/dashboard/email` | page complète | **redirect 308** vers `/dashboard/workspace` (preserve `?attach=…&to=…&subject=…&body=…`) |

Les routes API restent **strictement inchangées** :
- `/api/drive/list`, `/api/drive/upload`, `/api/drive/download`, `/api/drive/delete`
- `/api/email/send` (signature LR Consulting toujours appliquée côté serveur, ligne 210 de `app/api/email/send/route.ts`)
- `/api/auth/google`

### Arbre de composants

```
WorkspacePage (app/dashboard/workspace/page.tsx)
├── état : connected, isDrawerOpen, draft
├── hook : useDraftPersistence(draft, setDraft)
│
├── <WorkspaceHeader
│     hasDraft={draft.isDirty}
│     attachmentCount={draft.attachments.length}
│     onOpenDrawer={() => setIsDrawerOpen(true)} />
│
├── <DriveExplorer
│     onAttachFile={addToDraft}        ← nouvelle prop optionnelle
│     attachMode={isDrawerOpen} />     ← active le bouton "Joindre" au hover
│
└── <EmailDrawer
      open={isDrawerOpen}
      draft={draft}
      onChange={setDraft}
      onClose={() => setIsDrawerOpen(false)}
      onSent={clearDraft} />
        └── <EmailComposer ... />      (réutilisé en mode contrôlé)
```

### Composants à créer

| Composant | Rôle | Lignes estimées |
|---|---|---|
| `app/dashboard/workspace/page.tsx` | Page principale, état, redirections de connexion | ~180 |
| `components/workspace/WorkspaceHeader.tsx` | Header avec titre, breadcrumb, bouton « Nouveau mail / Brouillon » | ~80 |
| `components/workspace/EmailDrawer.tsx` | Tiroir latéral animé contenant `EmailComposer` | ~120 |
| `hooks/useDraftPersistence.ts` | localStorage + debounce + restauration | ~70 |

### Composants modifiés

| Composant | Modification | Impact |
|---|---|---|
| `components/email/EmailComposer.tsx` | Passage en mode **contrôlé** : props `draft` + `onChange` au lieu de `useState` interne. Suppression de `initialAttachments/initialTo/initialSubject/initialBody` (remplacés par `draft`). | ~30 lignes touchées, comportement identique côté envoi |
| `components/drive/DriveExplorer.tsx` | Nouvelles props optionnelles `onAttachFile`, `attachMode`. Propagées à `DriveFileRow`. | ~10 lignes |
| `components/drive/DriveFileRow.tsx` | Si `onAttach` reçu et `attachMode` true → afficher bouton « 📎 Joindre » au hover à la place du bouton download. Sinon comportement actuel. | ~15 lignes |

### Composants supprimés

| Fichier | Raison |
|---|---|
| `app/dashboard/drive/page.tsx` | Remplacé par redirect dans `app/dashboard/drive/page.tsx` (1 ligne) |
| `app/dashboard/drive/loading.tsx` | Plus pertinent (redirect immédiat) |
| `app/dashboard/email/page.tsx` | Remplacé par redirect |
| `app/dashboard/email/loading.tsx` | Plus pertinent |
| `components/email/DriveFilePicker.tsx` | Plus utilisé : la sélection de fichier Drive se fait directement via le bouton « Joindre » dans l'explorateur principal. |

### Fichiers à mettre à jour (références hors merge)

Tous les liens internes pointant vers `/dashboard/email` ou `/dashboard/drive` doivent être actualisés vers `/dashboard/workspace`. Les redirects 308 servent de filet de sécurité pour les bookmarks et liens externes, mais les sources internes pointent directement à la bonne URL.

| Fichier | Ligne | Modification |
|---|---|---|
| `components/layout/Sidebar.tsx` | 28, 33, 57, 58 | Supprimer les deux entrées « Drive » et « Email » + leurs icônes ; ajouter une seule entrée « Workspace » avec une icône combinée (folder + mail) ou icône maison Workspace |
| `components/drive/DriveFileRow.tsx` | 139 | Remplacer `window.location.href = '/dashboard/email?attach=…'` par `'/dashboard/workspace?attach=…'`. Ce bouton « Envoyer par mail » reste utile quand l'utilisateur arrive sur Drive sans tiroir ouvert. |
| `components/agent/AgentMessage.tsx` | 214 | Remplacer `'/dashboard/email?to=…&subject=…&body=…'` par `'/dashboard/workspace?to=…&subject=…&body=…'` (les liens générés par Reem AI). |
| `app/api/auth/google/route.ts` | 6 | Changer le défaut `'/dashboard/drive'` → `'/dashboard/workspace'` |
| `app/api/auth/google/callback/route.ts` | 23 | Changer le défaut `'/dashboard/drive'` → `'/dashboard/workspace'` |

> **Note** : la suppression de `DriveFilePicker` est intentionnelle. Avec le tiroir ouvert et le Drive visible à côté, ouvrir une modale picker au-dessus serait redondant. Le bouton « Depuis Drive » dans le composeur disparaît au profit du clic direct sur les fichiers de l'explorateur. Le bouton « Depuis mon PC » reste pour les uploads locaux.

---

## 4. État & persistance du brouillon

### Forme du `draft`

```typescript
interface Draft {
  to: string
  subject: string
  body: string
  attachments: Attachment[]
  isDirty: boolean   // dérivé : true si au moins un champ est rempli
}

interface Attachment {
  type: 'drive' | 'local'
  fileId?: string       // si type === 'drive'
  fileName: string
  mimeType: string
  data?: string         // base64 si type === 'local' (NON persisté)
  size?: number
}
```

### Hook `useDraftPersistence`

```typescript
function useDraftPersistence(): {
  draft: Draft
  setDraft: (d: Draft) => void
  clearDraft: () => void
}
```

Comportement :
1. **Au montage** : lit `localStorage["workspace.draft"]`. Si présent et non vide → restaure et marque le tiroir comme à ouvrir. Affiche un toast léger « Brouillon restauré ».
2. **À chaque changement de `draft`** : debounce 500ms puis écrit dans localStorage.
3. **`clearDraft()`** : reset l'état + supprime la clé localStorage. Appelé après envoi réussi ou clic explicite « Vider ».
4. **Filtrage à la sérialisation** : `attachments` de type `'local'` sont **exclus** de la persistance (pour ne pas saturer le quota localStorage avec des base64). Seules les références Drive (`fileId` + métadonnées) sont persistées.
5. **Fallback** : si `localStorage` est indisponible (navigation privée, quota dépassé, exception), on log un `console.warn` et on continue en mémoire seulement. Aucun crash.

### Compat query params Reem AI

Au montage de `WorkspacePage`, on lit les `searchParams` avec la même logique que l'actuelle `dashboard/email/page.tsx`. Si présents, on pré-remplit le `draft` ET on ouvre le tiroir. La logique est copiée à l'identique.

---

## 5. Layout & comportement visuel du tiroir

### Largeurs responsives

| Viewport | Largeur du tiroir | Comportement Drive |
|---|---|---|
| ≥ 1280px | 460px fixe | Compressé proportionnellement |
| 768–1279px | 420px fixe | Compressé proportionnellement |
| < 768px | 100% (overlay) | Drive masqué |

### Animation

- Ouverture : `transform: translateX(100%) → translateX(0)` en 200ms ease-out
- Fermeture : inverse, 200ms ease-in
- `opacity` accompagne pour éviter un effet sec

### États du bouton header

| Condition | Apparence |
|---|---|
| Pas de brouillon | « ✉️ Nouveau mail » (gradient indigo) |
| Brouillon non vide, tiroir fermé | « 📝 Brouillon en cours » + badge nombre de PJ si > 0 (couleur indigo discret) |
| Tiroir ouvert | Bouton masqué (le tiroir est déjà visible) |

### Bouton « Joindre » sur les fichiers Drive

- Visible **uniquement** si `attachMode === true` (tiroir ouvert)
- Apparaît au hover de la ligne fichier, à la place du bouton download
- Couleur : `rgba(99,102,241,0.15)` background, `#818cf8` text
- Clic → `onAttach(file)` → ajoute au `draft.attachments`, toast « Joint au mail »

### Cohérence design system

Utilisation stricte des tokens du projet (CLAUDE.md) :
- Backgrounds : `#07080d`, `#0f1117`, `#151a24`
- Texte : `#e8edf5`, `#8898aa`, `#3d4f63`
- Accents : `#6366f1` (indigo principal), `#818cf8` (indigo clair), `#f59e0b` (Drive), `#22c55e` (Local)
- Rayons : 14px conteneurs, 8px boutons
- Aucun nouveau composant UI inventé — tout est recomposé à partir de l'existant

---

## 6. Gestion d'erreurs

| Cas | Comportement |
|---|---|
| Google non connecté | Écran de connexion existant (réutilisé tel quel depuis `dashboard/email/page.tsx`) |
| Échec d'attachement Drive (fichier supprimé entre-temps) | Toast d'erreur, brouillon intact, fichier non ajouté |
| Échec d'envoi email | Status d'erreur dans le tiroir (déjà géré par `EmailComposer`), brouillon préservé pour retry |
| `localStorage` indisponible | Fallback silencieux en mémoire, `console.warn` |
| Restauration d'un brouillon avec Drive `fileId` qui n'existe plus | À l'envoi, l'API renvoie une erreur ; le toast explique « fichier introuvable », l'utilisateur retire la PJ |

### Activity log

L'envoi d'email est déjà loggé via `/api/email/send`. **Aucun nouveau log à ajouter** — le merge est purement UI, pas de nouvelle action métier.

### Signature LR Consulting

**Garantie non-régression explicite** : la signature est appliquée côté serveur dans `app/api/email/send/route.ts` (ligne 210, `const signature = ...`, concaténée ligne 234 `htmlBody + signature`). Aucun changement à ce flux. Tout email envoyé via le tiroir contient la signature, exactement comme aujourd'hui.

---

## 7. Stratégie de vérification (zéro régression)

### Discipline systématique

Après chaque modification non triviale de fichier :

1. `npm run lint` → zéro warning, zéro erreur
2. `npx tsc --noEmit` → zéro erreur TS
3. `npm run build` → build prod doit passer
4. `npm test` → les 25 tests Vitest existants doivent rester verts

### Sous-agents reviewer

Avant de marquer une étape majeure comme terminée, lancer un agent `Explore` ou `code-reviewer` qui audit les fichiers touchés à la recherche de :
- Imports cassés ou orphelins
- Props manquants ou typés incorrectement
- Comportements régressés
- Composants qui ne reçoivent plus leur état attendu

### Tests fonctionnels manuels (à confirmer par l'utilisateur)

Liste obligatoire avant de considérer le merge comme terminé :

- [ ] Composer un email texte sans PJ depuis le tiroir → envoi OK, signature présente
- [ ] Joindre un fichier Drive via le bouton « Joindre » au hover → apparaît dans les chips
- [ ] Joindre un fichier local via « Depuis mon PC » → apparaît dans les chips
- [ ] Fermer le tiroir, le rouvrir → brouillon intact (champs + PJ Drive)
- [ ] Refresh navigateur avec un brouillon en cours → brouillon restauré, toast affiché
- [ ] Envoyer un email avec PJ locale → après refresh, brouillon est vide (PJ locale non persistée par design)
- [ ] Naviguer vers `/dashboard/email?attach=xxx&to=…` → redirige vers workspace, tiroir ouvert avec PJ pré-remplie
- [ ] Naviguer vers `/dashboard/drive` → redirige vers workspace
- [ ] Connexion Google déconnectée → écran de connexion s'affiche
- [ ] Déclencher un envoi depuis Reem AI → fonctionne sans modification (les liens existants pointent toujours)
- [ ] Sidebar : une seule entrée « Workspace » au lieu de Drive + Email
- [ ] Vérifier que la signature LR Consulting est bien présente dans le mail reçu
- [ ] Cliquer sur « Envoyer par mail » depuis un fichier dans le Drive (tiroir fermé) → ouvre la page workspace avec le tiroir ouvert et le fichier pré-attaché
- [ ] Se déconnecter puis se reconnecter à Google → après OAuth, on arrive bien sur `/dashboard/workspace` (et non plus `/dashboard/drive`)

### Tests Vitest à ajouter

| Fichier | Tests |
|---|---|
| `__tests__/hooks/useDraftPersistence.test.ts` | Restauration depuis localStorage / debounce d'écriture / clear après envoi / fallback localStorage indisponible / exclusion des PJ locales de la sérialisation |

Pas de test E2E — le manuel suffit pour un outil interne.

---

## 8. Hors scope

Délibérément **non** inclus dans cette refonte :

- Inbox / lecture des emails reçus (Email reste un canal sortant uniquement)
- Multi-brouillons (un seul brouillon à la fois, comme aujourd'hui)
- Drag & drop d'un fichier Drive vers le tiroir (le bouton « Joindre » suffit ; à reconsidérer si demande utilisateur)
- Recherche dans Drive (déjà absente aujourd'hui, hors scope)
- Templates d'email
- Édition WYSIWYG du body (textarea brute conservée comme aujourd'hui)

---

## 9. Risques & mitigations

| Risque | Probabilité | Mitigation |
|---|---|---|
| Régression silencieuse sur l'envoi d'email | Moyenne | Tests fonctionnels manuels obligatoires + sous-agent reviewer + signature loggée côté serveur |
| Quota localStorage saturé | Faible | Exclusion des PJ locales du stockage + fallback silencieux |
| Liens externes pointant vers `/dashboard/email` | Faible | Redirect 308 qui preserve les query params |
| Confusion utilisateur (changement d'UX) | Faible | Une seule entrée sidebar, le composeur est visuellement identique, pattern Gmail/Linear connu |
| Perf du rendu (Drive + tiroir simultanés) | Très faible | Composants déjà légers, pas de nouvelle requête, le tiroir réutilise du code existant |

---

## 10. Critères de succès

Le merge est considéré comme réussi si :

1. ✅ Tous les tests fonctionnels manuels de la section 7 passent
2. ✅ `npm run lint && npx tsc --noEmit && npm run build && npm test` passent sans erreur
3. ✅ Un email envoyé depuis le tiroir contient la signature LR Consulting (vérification dans la boîte de réception)
4. ✅ Le brouillon survit à un refresh navigateur
5. ✅ Aucune régression sur Reem AI (génération de liens email avec PJ Drive)
6. ✅ Le sidebar a une seule entrée « Workspace » au lieu de deux
7. ✅ Le sous-agent code-reviewer ne signale aucun problème sur les fichiers touchés
