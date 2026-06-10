# Refonte UI « Liquid Glass » — Spec design

**Date :** 2026-06-10
**Statut :** validée par Hugues (brainstorm visuel, option « Glass sombre » puis itération « pro »)
**Mockups de référence :** `.superpowers/brainstorm/2196-1781117817/content/apple-revolut.html` (option B) et `apple-revolut-pro.html`

## Direction

Croisement **Revolut × Apple Liquid Glass** (iOS 26 / macOS Tahoe), en sombre :
- **Structure Revolut** : solde héros en très grand, commissions traitées comme des transactions, pills et segmented controls, dégradé signature violet→bleu.
- **Matériau Apple** : cartes en verre dépoli translucide sur fond noir profond traversé de nappes lumineuses, liserés clairs, profondeur par couches.

## Contraintes non négociables

1. **Reskin pur — zéro changement fonctionnel.** Aucune modification de `hooks/`, `lib/`, `app/api/`, du schéma Supabase ni du realtime. Seuls les composants visuels (`components/`, pages, `globals.css`) changent.
2. **Tout marche comme avant.** Chaque feature existante (CRUD commissions/paiements/sommes dues, chat + vocaux + mentions, Drive, email, présence Sheets, export Excel, filtres, pagination, impersonation des rôles) doit être re-testée après reskin.
3. **Ultra fluide.** Les animations servent la fluidité perçue, jamais le spectacle. Budget : 60fps constant.
4. **Reem AI : reskin minimal seulement** (couleurs/verre sur l'existant). Sa refonte fonctionnelle est un chantier séparé, déjà prévu.

## Tokens (globals.css `@theme`)

### Fonds et verre
| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#0a0a0e` | fond app |
| `--glass-surface` | `rgba(255,255,255,.055)` | cartes standard |
| `--glass-surface-strong` | `rgba(255,255,255,.07)` | carte héros, modales |
| `--glass-border` | `rgba(255,255,255,.10)` | bordure 1px |
| `--glass-border-strong` | `rgba(255,255,255,.13)` | héros, modales |
| `--glass-blur` | `28px` | backdrop-filter standard |
| `--glass-highlight` | `inset 0 1px 0 rgba(255,255,255,.10)` | liseré haut de carte |
| `--glass-divider` | `rgba(255,255,255,.06)` | séparateurs de listes |

### Nappes lumineuses (fond, fixes, derrière tout)
- Violet `rgba(106,92,255,.26)` haut-gauche · Bleu `rgba(59,130,246,.18)` droite · Pourpre `rgba(168,85,247,.12)` bas. Radial-gradients flous (`blur(40px)`), `position: fixed`, `pointer-events: none`, rendues une seule fois (pas d'animation).

### Accent et statuts
| Token | Valeur | Usage |
|---|---|---|
| `--gradient-accent` | `linear-gradient(135deg,#6a5cff,#3b82f6)` | CTA primaires, badge chat, logo, courbes |
| `--color-success` | `#3ddc8b` | payé / encaissé / positif |
| `--color-warning` | `#f0a33c` | partiel / en attente / échéance |
| `--color-danger` | `#ff8589` (fond `rgba(255,99,105,.13)`) | dû / retard |
| `--color-info` | `#6a8dff` | liens « Tout voir » |

### Texte
`#f5f5f8` (principal) · `#c9c9d4` (secondaire) · `#9b9ba8` (labels) · noir `#0a0a0e` sur boutons blancs/dégradés.

### Typographie et géométrie
- Police : `-apple-system, 'SF Pro Display', Inter, sans-serif` (SF natif sur les Mac des deux utilisateurs, fallback Inter déjà chargé).
- Solde héros : 42px / 800 / tracking -.045em, **centimes en 25px réduits**. KPIs : 19-21px / 800. Labels : 11-12px / 600.
- Radius : 22-24px (héros, modales) · 18-20px (cartes) · 11px (items nav) · 999px (pills, boutons, segmented).
- Boutons : pill. Primaire = dégradé accent + ombre colorée `0 4px 18px rgba(106,92,255,.40)` ; secondaire = verre ; « action forte » = blanc pur sur verre (ex. « Régler → »).

## Composants (mapping existant → nouveau)

| Existant | Traitement |
|---|---|
| `AppShell` / `Sidebar` | Sidebar **verre flottante** détachée (margin, radius 20px), icônes SVG fines 15px, item actif = verre plus opaque + liseré, badge chat dégradé, profil en bas. Raccourcis kbd conservés. |
| `KpiGrid` / `KpiCard` | La carte « Dû à Ladislas » devient le **héros** (solde 42px, pills contextuels, sparkline SVG dégradé). Les 3 autres KPIs : cartes verre compactes avec delta en pill. |
| `CommissionTable` | Style **liste de transactions** : pastille initiales de prime (cercle verre teinté de la couleur de prime), libellé + sous-ligne (mois · CA), montant à droite en gras, statut en texte coloré sous le montant. Filtres → segmented control pill « Tout / Dû / Payé » + filtres avancés existants dans un popover verre. Pagination conservée. |
| `PaiementTracker` | Liste compacte à droite : facture, sous-ligne statut coloré (Échéance / Retard J+n / Réglée le…), montant à droite. |
| `RepartitionChart` / `CaCommissionChart` | Recharts conservé, re-thémé : barre segmentée + légende lignes pour la répartition ; courbes avec dégradé accent. |
| `SommesDues` | Carte verre, progressbar fine dégradé. |
| `Modal` | Verre fort + blur 30px, overlay `rgba(0,0,0,.5)`, scale-in 150ms. createPortal conservé. |
| `Toast` | Pill verre flottante, slide-in 200ms. |
| `StatusBadge` | → texte coloré 10px/700 (listes) ou pill translucide bordée (vues détail). |
| `Button` / `Input` / `Select` | Pills ; inputs = verre avec focus ring dégradé. |
| Chat (`ChatWindow`, etc.) | Bulles verre, input pill, mêmes comportements (vocaux, mentions, upload, bandeaux d'erreur — re-skinnés en pills danger). |
| Pages Workspace / Présence / Clients / Login / Register | Mêmes primitives appliquées. CalendrierGrid : cases verre, états France/Bahreïn teintés accent/warning. |

## Fluidité & performance (le « ultra fluide »)

1. **Backdrop-filter discipliné** : appliqué aux cartes de premier niveau uniquement (~8-12 par écran max). Les éléments DANS une carte n'ont jamais leur propre blur. Les nappes de fond sont statiques.
2. **Animations** : uniquement `transform` et `opacity` (compositées GPU). Durées 150-200ms, easing `cubic-bezier(0.32, 0.72, 0, 1)` (ressenti Apple). Hover cartes : `translateY(-1px)` + bordure éclaircie. Pas d'animation sur les nappes ni de shimmer permanent.
3. **`prefers-reduced-motion`** respecté (animations coupées).
4. **Fallback sans backdrop-filter** : `@supports not (backdrop-filter: blur(1px))` → surfaces opaques `#15151c`.
5. **Aucune régression de data-flow** : optimistic updates et realtime existants = la fluidité fonctionnelle est déjà là, on ne touche pas.

## Stratégie d'implémentation (pour le plan à venir)

Ordre : **tokens d'abord, puis primitives partagées, puis module par module** — l'app reste utilisable à chaque étape.

1. Phase 0 — tokens `globals.css` + nappes de fond + classe utilitaire `.glass` / `.glass-strong`.
2. Phase 1 — primitives UI (`Button`, `Modal`, `Toast`, `StatusBadge`, `Input`, `Select`).
3. Phase 2 — AppShell + Sidebar.
4. Phase 3 — Dashboard (héros, KPIs, CommissionTable, PaiementTracker, charts, SommesDues).
5. Phase 4 — Chat.
6. Phase 5 — Facturation, Workspace, Présence, Clients, Login/Register.
7. Phase 6 — Reem reskin minimal + balayage des styles inline résiduels + audit visuel route par route en dev (`npm run dev`, validation navigateur AVANT push — règle projet).

Vérification à chaque phase : `npm run lint` + `npm test` (41) + `npm run build` + contrôle visuel. Migration des styles inline vers classes/tokens au passage, composant par composant — jamais de refactor de logique en même temps que le style.

## Hors scope

- Refonte fonctionnelle de Reem AI (chantier suivant, dédié).
- Réconciliation Commission ↔ Paiement (feature, pas UI).
- Mode clair (pas demandé ; les tokens le permettront plus tard).
