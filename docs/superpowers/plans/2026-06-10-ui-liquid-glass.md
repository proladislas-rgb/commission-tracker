# Refonte UI « Liquid Glass » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskinner toute l'UI de Commission Tracker dans le design system Liquid Glass (Revolut × Apple, sombre) sans toucher à la logique (hooks/lib/api/Supabase intacts), avec tests verts à chaque tâche.

**Architecture:** Tokens CSS et utilitaires `.glass` posés d'abord dans `globals.css` (Tailwind 4 `@theme`), nappes lumineuses fixes montées une fois dans le layout, puis migration composant par composant (primitives UI partagées → AppShell/Sidebar → Dashboard → Chat → pages restantes). Chaque tâche laisse l'app fonctionnelle.

**Tech Stack:** Next.js 16, Tailwind CSS 4 (`@theme`), Recharts, styles inline existants à migrer progressivement vers les tokens.

**Branche :** `ui/liquid-glass` — merge dans `main` uniquement après audit visuel de Hugues (règle projet : validation navigateur avant push de modifs visuelles).

**Référence visuelle :** `.superpowers/brainstorm/2196-1781117817/content/apple-revolut-pro.html` (ouvrir dans un navigateur pour comparer pendant l'implémentation).

**Vérification standard (chaque tâche) :** `npm run lint && npm test && npm run build` → 0 erreur, 41/41, build OK. Noté « **Vérif standard** » ci-dessous.

---

### Task 0 : Branche

- [ ] **Step 1 :** `git checkout -b ui/liquid-glass`
- [ ] **Step 2 :** `npm test` → 41/41 (état de départ sain)

---

### Task 1 : Tokens + utilitaires glass + nappes de fond (Phase 0)

**Files:**
- Modify: `app/globals.css`
- Create: `components/layout/GlassBackdrop.tsx`
- Modify: `app/layout.tsx` (monter GlassBackdrop)

- [ ] **Step 1 : Ajouter les tokens au `@theme` de `app/globals.css`** (conserver les tokens existants le temps de la migration ; les retirer en Task 7) :

```css
@theme {
  /* ... tokens existants conservés ... */

  /* Liquid Glass */
  --color-lg-bg: #0a0a0e;
  --color-lg-text: #f5f5f8;
  --color-lg-text-2: #c9c9d4;
  --color-lg-muted: #9b9ba8;
  --color-lg-success: #3ddc8b;
  --color-lg-warning: #f0a33c;
  --color-lg-danger: #ff8589;
  --color-lg-info: #6a8dff;
  --color-lg-accent-1: #6a5cff;
  --color-lg-accent-2: #3b82f6;
}
```

- [ ] **Step 2 : Ajouter les classes utilitaires** à la fin de `globals.css` :

```css
/* ===== Liquid Glass utilities ===== */
.glass {
  background: rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10);
  border-radius: 20px;
}
.glass-strong {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow: 0 12px 44px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.13);
  border-radius: 22px;
}
.glass-divider { background: rgba(255, 255, 255, 0.06); height: 1px; }
.lg-gradient { background: linear-gradient(135deg, #6a5cff, #3b82f6); }
.lg-shadow-accent { box-shadow: 0 4px 18px rgba(106, 92, 255, 0.40); }
.lg-ease { transition: transform 180ms cubic-bezier(0.32, 0.72, 0, 1), border-color 180ms cubic-bezier(0.32, 0.72, 0, 1), background-color 180ms cubic-bezier(0.32, 0.72, 0, 1); }
.lg-hover-lift:hover { transform: translateY(-1px); border-color: rgba(255, 255, 255, 0.18); }

@supports not (backdrop-filter: blur(1px)) {
  .glass { background: #15151c; }
  .glass-strong { background: #181821; }
}
@media (prefers-reduced-motion: reduce) {
  .lg-ease, .lg-hover-lift { transition: none; }
  .lg-hover-lift:hover { transform: none; }
}
```

- [ ] **Step 3 : Créer `components/layout/GlassBackdrop.tsx`** (nappes statiques, montées une fois) :

```tsx
export default function GlassBackdrop() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -120, left: '10%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(106,92,255,.26), transparent 65%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', top: '30%', right: -140, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.18), transparent 65%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: -160, left: -100, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.12), transparent 65%)', filter: 'blur(40px)' }} />
    </div>
  )
}
```

- [ ] **Step 4 :** Dans `app/layout.tsx` : fond `#0a0a0e` sur `<body>`, monter `<GlassBackdrop />` avant `{children}`, et s'assurer que le contenu app est en `position: relative; z-index: 1`. Police : préfixer la stack existante par `-apple-system, 'SF Pro Display'` (Inter reste en fallback chargé par next/font).
- [ ] **Step 5 : Vérif standard.**
- [ ] **Step 6 :** `git add -A && git commit -m "feat(ui): tokens Liquid Glass + utilitaires .glass + nappes de fond"`

---

### Task 2 : Primitives UI (Phase 1)

**Files (Modify, styles uniquement — props/API inchangées) :**
- `components/ui/Button.tsx` — pill (radius 999). Primaire : `.lg-gradient .lg-shadow-accent` texte blanc 600. Secondaire : `.glass` (radius 999 surchargé). Danger : fond `rgba(255,99,105,.13)` bordure `rgba(255,99,105,.22)` texte `#ff8589`. Variante « forte » (si existante) : fond blanc `rgba(255,255,255,.92)` texte `#0a0a0e`.
- `components/ui/Input.tsx` + `Select.tsx` — fond `rgba(0,0,0,.30)`, bordure `--glass-border`, radius 12px, focus : bordure `#6a5cff` + ring `0 0 0 3px rgba(106,92,255,.25)`.
- `components/ui/Modal.tsx` — panneau `.glass-strong`, overlay `rgba(0,0,0,.5)` + `backdrop-filter: blur(8px)`, animation scale-in 150ms via `--animate-modalIn` existante (ajuster keyframe à `scale(.97)→1`). createPortal conservé.
- `components/ui/Toast.tsx` — pill `.glass-strong` radius 999, icône statut colorée, timings existants conservés.
- `components/ui/StatusBadge.tsx` — pill translucide : fond `.12-.13` + bordure `.22-.26` de la couleur de statut, texte 10px/700. Mapping : paye/effectue→success, partiel/en_attente→warning, due/en_retard→danger.
- `components/ui/ErrorAlert.tsx` + `ReconnectGoogleBanner.tsx` — pills danger/warning translucides (mêmes recettes).
- `components/ui/InlineEdit.tsx` — état édition = style Input ci-dessus.

- [ ] **Step 1 :** Lire chaque fichier, appliquer le traitement indiqué. Ne toucher AUCUNE prop ni logique.
- [ ] **Step 2 : Vérif standard** + lancer `npm run dev` et vérifier /login (boutons/inputs visibles sans casse).
- [ ] **Step 3 :** `git commit -am "feat(ui): primitives Liquid Glass (Button, Input, Modal, Toast, badges)"`

---

### Task 3 : AppShell + Sidebar + Header (Phase 2)

**Files:** `components/layout/AppShell.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Header.tsx`

Traitement Sidebar (cf. mockup pro) :
- Conteneur : `.glass` détaché du bord (margin 18px, hauteur `calc(100vh - 36px)`, radius 20px), largeur ~190px.
- Logo : carré 28px radius 9px `.lg-gradient`, libellé « Tracker ».
- Items : radius 11px padding 8px 10px ; actif = fond `rgba(255,255,255,.10)` + bordure `.08` + texte blanc ; inactif = texte `#9b9ba8`, hover `rgba(255,255,255,.05)` via `.lg-ease`.
- Icônes : SVG inline stroke 2, 15px (dashboard=grilles, clients=2 personnes, facturation=document, workspace=enveloppe, présence=calendrier, chat=bulle) — reprendre les paths du mockup `apple-revolut-pro.html`.
- Badge unread chat : pill `.lg-gradient` 9.5px/800.
- Bloc user en bas : avatar initiales 26px `rgba(255,255,255,.12)`, nom + rôle. Rename associé inline conservé tel quel (fonctionnel).
- Mobile : le drawer existant garde son comportement (MobileSidebar/contexte), seul le style change.
- AppShell : fond transparent (le body porte `#0a0a0e`), contenu principal `position:relative; z-index:1`, padding 18px, FULL_WIDTH_PATHS inchangés.

- [ ] **Step 1 :** Lire les 3 fichiers, appliquer. Raccourcis clavier et logique unread intouchés.
- [ ] **Step 2 : Vérif standard** + dev : naviguer sur 3 routes, sidebar OK partout.
- [ ] **Step 3 :** `git commit -am "feat(ui): sidebar verre flottante + AppShell Liquid Glass"`

---

### Task 4 : Dashboard (Phase 3)

**Files:** `components/dashboard/KpiGrid.tsx`, `KpiCard.tsx`, `CommissionTable.tsx`, `PaiementTracker.tsx`, `SommesDues.tsx`, `CaCommissionChart.tsx`, `RepartitionChart.tsx`, `ExportButton.tsx`, `SeedButton.tsx`, `app/dashboard/page.tsx` (layout + header de page uniquement)

- [ ] **Step 1 — Héros :** la KPI « Commissions dues » devient carte héros `.glass-strong` pleine largeur au-dessus de la grille : label « Solde dû à Ladislas » 12px muted ; montant 42px/800 tracking -.045em avec décimales+€ en 25px `#c9c9d4` ; pills contextuels (nb dossiers en danger-pill, prochaine échéance en pill verre) ; bouton « Régler → » blanc (`rgba(255,255,255,.92)` texte `#0a0a0e`) si une action de paiement existe, sinon omis (YAGNI) ; sparkline SVG : reprendre le path du mockup avec gradient `#6a5cff→#3b82f6`, alimentée par les montants mensuels déjà présents dans les données du dashboard (somme commissions par mois, 6 derniers points ; si < 2 points, masquer le SVG).
- [ ] **Step 2 — KPIs restants :** cartes `.glass` compactes : label 11px muted, valeur 19-21px/800, delta en mini-pill (success/neutre).
- [ ] **Step 3 — CommissionTable :** conteneur `.glass` ; en-tête : titre + segmented control « Tout / Dû / Payé » (conteneur `rgba(0,0,0,.35)` radius 999, segment actif `rgba(255,255,255,.13)`) branché sur le filtre statut EXISTANT (mapping : Tout=∅, Dû=due+partiel, Payé=paye) ; filtres avancés existants (mois, CA min/max) dans un popover `.glass-strong` ouvert par un bouton « Filtres » pill ; lignes : pastille 36px initiales de prime (2-3 lettres, fond `rgba(<couleur prime>,.14)` bordure `.28`, texte teinte claire de la prime — couleurs depuis `PRIME_COLORS`/`prime.color` existants) ; libellé « Prime <nom> » + sous-ligne « <Mois> · CA <montant> € » ; montant commission à droite 13px/800 ; statut texte coloré 10px/700 sous le montant ; séparateurs `.glass-divider` indentés `margin-left: 66px`. Édition inline, suppression, pagination : logique intacte, restylée (boutons pagination = pills verre).
- [ ] **Step 4 — PaiementTracker :** carte `.glass`, lignes compactes : libellé 11.5px/600 + sous-ligne statut colorée (« Échéance <date> » warning / « En retard · J+n » danger / « Réglée le <date> » success), montant à droite 12px/800 coloré selon statut.
- [ ] **Step 5 — SommesDues :** carte `.glass`, progressbar 8px radius 999 `.lg-gradient`, total à droite en danger si > 0.
- [ ] **Step 6 — Charts :** RepartitionChart → barre segmentée horizontale (flex, segments aux couleurs de primes, gap 2px, radius 999) + légende lignes (carré 8px radius 3px, nom, montant/part) — remplace le PieChart si plus simple, sinon re-thémer le Pie avec ces couleurs et fond transparent. CaCommissionChart → Recharts re-thémé : grille `rgba(255,255,255,.05)`, axes texte `#9b9ba8` 10px, barres/courbes aux teintes accent, tooltip conteneur `.glass-strong`.
- [ ] **Step 7 — `app/dashboard/page.tsx` :** header de page (« Vue d'ensemble » 19px/800 + sous-titre client · mois) + grille `1.45fr 1fr` (gauche : héros + commissions ; droite : KPIs duo + répartition + paiements + sommes dues). Toute la logique (handlers, logActivity, hooks) inchangée.
- [ ] **Step 8 : Vérif standard** + dev : CRUD complet sur /dashboard (ajouter/éditer/supprimer une commission, ajouter un paiement, toggle somme due) → tout fonctionne, toasts OK.
- [ ] **Step 9 :** `git commit -am "feat(ui): dashboard Liquid Glass (héros, transactions, charts)"`

---

### Task 5 : Chat (Phase 4)

**Files:** `components/chat/ChatSidebar.tsx`, `ChatWindow.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `app/dashboard/chat/page.tsx`

- [ ] **Step 1 :** ChatSidebar → panneau `.glass` (canaux : item actif verre clair, badge unread pill gradient). ChatWindow → fond transparent (nappes visibles), header canal en bandeau `.glass` fin, bandeaux d'erreur existants (chatError/uploadError/notifyFailures/ReconnectGoogleBanner) → pills danger/warning translucides ; séparateurs de date : texte 9px muted entre `.glass-divider`. ChatMessage → bulles : messages des autres `.glass` radius 16px ; messages à soi `.lg-gradient` texte blanc radius 16px ; réactions = mini-pills verre ; player audio et fichiers = conteneur verre. ChatInput → barre pill `.glass-strong` (textarea transparent, boutons micro/upload/envoi en icônes 15px, envoi = rond `.lg-gradient`). Drag overlay → bordure dashed `rgba(106,92,255,.5)` sur fond `rgba(10,10,14,.85)`.
- [ ] **Step 2 :** Aucune modification de la logique vocaux/mentions/upload/notify (durcie en juin — ne pas y toucher).
- [ ] **Step 3 : Vérif standard** + dev : envoyer un message, une réaction, un fichier sur /dashboard/chat.
- [ ] **Step 4 :** `git commit -am "feat(ui): chat Liquid Glass"`

---

### Task 6 : Pages restantes (Phase 5)

**Files:** `components/invoices/InvoicePreview.tsx` + `InvoiceChat.tsx` + `app/dashboard/invoices/page.tsx` ; `components/workspace/EmailComposer.tsx` + `EmailDrawer.tsx` ; `components/drive/DriveExplorer.tsx` + `DriveFileRow.tsx` ; `app/dashboard/workspace/page.tsx` ; `components/presence/CalendrierGrid.tsx` + `CompteurCards.tsx` + `AlerteSeuil.tsx` + `app/dashboard/calendrier-presence/page.tsx` ; `components/clients/ClientSelector.tsx` + `app/dashboard/clients/page.tsx` ; `app/login/page.tsx` + `app/register/page.tsx` (+ `components/register/RegisterWizard.tsx`, `components/join/JoinPage.tsx` si stylés à part) ; `app/error.tsx`, `app/not-found.tsx`, `app/dashboard/error.tsx`, tous les `loading.tsx` (skeletons → blocs `.glass` pulsants via `--animate-pulse2` existant)

- [ ] **Step 1 :** Appliquer les primitives partout : conteneurs `.glass`, formulaires = Input/Select/Button déjà reskinnés, listes Drive = lignes type transactions (icône type de fichier en pastille), CalendrierGrid = cases radius 8px (France = fond accent `.20` bordure `.35` ; Bahreïn = warning ; vide = `rgba(255,255,255,.04)`), CompteurCards = cartes `.glass` avec valeur 21px/800 + progress fine, AlerteSeuil = pill warning/danger pleine largeur. InvoicePreview : NE PAS toucher au template HTML de la facture envoyée par email (rendu externe) — seul l'écrin de prévisualisation passe en verre. Login/Register : carte `.glass-strong` centrée 400px sur les nappes, logo gradient.
- [ ] **Step 2 : Vérif standard** + dev : parcourir chaque route, soumettre le formulaire login, toggle un jour de présence.
- [ ] **Step 3 :** `git commit -am "feat(ui): facturation, workspace, présence, clients, auth en Liquid Glass"`

---

### Task 7 : Reem minimal + nettoyage + audit (Phase 6)

**Files:** `components/reem/ReemWidget.tsx`, `ReemBubble.tsx`, `ReemPanel.tsx`, `ReemPullTab.tsx`, `ReemInsights.tsx` (styles seulement) ; `app/globals.css` ; `CLAUDE.md`

- [ ] **Step 1 :** Reem : panel/bulle → `.glass-strong`, accents → gradient. RIEN d'autre (refonte fonctionnelle = chantier séparé).
- [ ] **Step 2 :** Balayage : `grep -rn "#07080d\|#0f1117\|#151a24\|#6366f1\b" components app --include="*.tsx"` → migrer les résidus vers les tokens ; retirer du `@theme` les anciens tokens devenus orphelins (vérifier par grep avant chaque retrait).
- [ ] **Step 3 :** Mettre à jour la section « Design system » de `CLAUDE.md` (projet) avec les tokens Liquid Glass + pointer `~/.claude/design-systems/liquid-glass.md`.
- [ ] **Step 4 : Vérif standard** + dev : audit route par route (toutes les pages + modales + toasts), comparaison avec le mockup de référence.
- [ ] **Step 5 :** `git commit -am "feat(ui): reem reskin minimal + purge anciens tokens + docs"`
- [ ] **Step 6 — GATE :** Audit visuel par Hugues en local (`npm run dev`). Merge `ui/liquid-glass` → `main` + push UNIQUEMENT après son OK. Puis promote Vercel.

## Self-review

- Couverture spec : tokens (T1), primitives (T2), shell (T3), dashboard+héros+transactions (T4), chat (T5), pages (T6), Reem minimal+purge+gate visuel (T7) — toutes les sections de la spec ont une tâche. Fluidité : utilitaires `.lg-ease`/`.lg-hover-lift`, reduced-motion et fallback dans T1, discipline blur via primitives.
- Contrainte « zéro logique » répétée par tâche ; le segmented control réutilise le filtre statut existant (pas de nouvelle logique, un mapping).
- Pas de TDD nouveau : reskin pur — le filet est la suite existante (41 tests, dont aucun ne teste le style) + build + lint + smoke dev par tâche.
