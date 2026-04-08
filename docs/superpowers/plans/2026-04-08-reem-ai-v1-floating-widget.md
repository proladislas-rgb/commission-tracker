# Reem AI V1 — Widget flottant contextuel (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Transformer Reem AI d'une page chat isolée en un widget flottant contextuel accessible partout, avec 5 tools de lecture/rédaction non-destructifs, des suggestions contextuelles, et des insights LLM-powered sur le dashboard — sans aucun tool d'écriture en DB (réservé à V2).

**Architecture :** Un composant `<ReemWidget />` monté dans le layout global `/dashboard/layout.tsx` qui gère 3 états (bulle / panneau / masqué) via un hook `useReemUIPersistence` (localStorage debouncé). Le panneau réutilise les composants existants `AgentMessage.tsx` et `AgentInput.tsx` mais reçoit désormais un objet `ReemContext` (pathname, client actif, entité courante) qui est injecté dans le prompt système Anthropic. Les tools `lib/agent-tools.ts` sont refactorés : suppression des 2 tools d'écriture `create_commission` / `create_paiement`, fusion des 5 tools de lecture en un `query_data` unifié, ajout de `get_overdue_payments`, `summarize_period`, `propose_navigation`. Une nouvelle route `/api/agent/insights` appelle Claude avec un structured output pour générer jusqu'à 3 insights affichés en bas du dashboard.

**Tech Stack :** Next.js 16 · React 19 · TypeScript strict · Tailwind · Vitest + @testing-library/react · Anthropic SDK · Supabase

**Spec :** `docs/superpowers/specs/2026-04-08-reem-ai-floating-widget-design.md`

---

## File Structure

### Créations (12 fichiers)

| Path | Rôle |
|---|---|
| `lib/reem-types.ts` | Types `ReemContext`, `ReemUIState`, `Insight`, `ReemVisibility` |
| `lib/reem-suggestions.ts` | `getSuggestions(pathname, context): string[]` |
| `hooks/useReemUIPersistence.ts` | State `{visibility, draftMessage}` + localStorage debounce + validation |
| `__tests__/hooks/useReemUIPersistence.test.tsx` | 5 tests Vitest (TDD) |
| `__tests__/lib/reem-suggestions.test.ts` | 4 tests Vitest |
| `hooks/useReemContext.ts` | Dérive `ReemContext` depuis pathname + useClientContext |
| `components/reem/ReemBubble.tsx` | Bulle ronde 54px bas-droite |
| `components/reem/ReemPullTab.tsx` | Languette 22×60 bord droit |
| `components/reem/ReemPanel.tsx` | Panneau flottant 380×540 (réutilise AgentMessage + AgentInput) |
| `components/reem/ReemHistoryView.tsx` | Vue historique dans le panneau (bouton 📋) |
| `components/reem/ReemWidget.tsx` | Orchestrateur 3-états, `⌘L`, montage global |
| `components/reem/ReemInsights.tsx` | Encart dashboard, fetch insights, 3 cartes discrètes |
| `app/api/agent/insights/route.ts` | GET : LLM-powered insights via structured output Claude |

### Modifications (6 fichiers)

| Path | Modif |
|---|---|
| `lib/agent-tools.ts` | Refonte complète : 5 tools V1 (`query_data`, `get_overdue_payments`, `summarize_period`, `draft_email`, `search_drive`) + `propose_navigation`. Suppression `create_commission`, `create_paiement`, `query_commissions`, `query_paiements`, `query_clients`, `query_sommes_dues`, `query_activity` |
| `app/api/agent/chat/route.ts` | Accepte `context: ReemContext` dans body, injecte dans prompt système + `AgentContext`. Plus de gestion `create_*` dans la loop `tool_use`. |
| `hooks/useAgentMessages.ts` | `sendMessage(message, context)` nouveau param obligatoire. Suppression de `confirmAction` (plus utilisé en V1). |
| `app/dashboard/layout.tsx` | Ajout `<ReemWidget />` après `{children}` |
| `components/layout/Sidebar.tsx` | Suppression entrée « Reem AI » + icône |
| `app/dashboard/page.tsx` | Ajout `<ReemInsights />` en bas de page |

### Suppressions (2 fichiers)

- `app/dashboard/agent/page.tsx`
- `app/dashboard/agent/loading.tsx`

---

## Task 1 — Types partagés Reem

**Files:**
- Create: `lib/reem-types.ts`

- [ ] **Step 1: Créer le fichier**

```typescript
// lib/reem-types.ts

export type ReemVisibility = 'bubble' | 'panel-open' | 'hidden'

export interface ReemUIState {
  visibility: ReemVisibility
  draftMessage: string
}

export const EMPTY_REEM_UI: ReemUIState = {
  visibility: 'bubble',
  draftMessage: '',
}

export interface ReemEntityRef {
  type: 'client' | 'commission' | 'paiement' | 'invoice' | 'email_draft'
  id?: string
  preview?: string
}

export interface ReemContext {
  pathname: string
  pageLabel: string
  activeClientId: string | null
  selectedEntity?: ReemEntityRef
}

export interface Insight {
  id: string
  severity: 'info' | 'warning' | 'alert'
  icon: string            // emoji
  title: string           // max 8 mots
  description: string     // 1 phrase avec chiffres
  actionLabel: string
  actionPrompt: string    // prompt envoyé à Reem si clic
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 3: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add lib/reem-types.ts
git commit -m "feat(reem): types partagés V1 (ReemContext, ReemUIState, Insight)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Hook `useReemUIPersistence` (TDD)

**Files:**
- Create: `__tests__/hooks/useReemUIPersistence.test.tsx`
- Create: `hooks/useReemUIPersistence.ts`

- [ ] **Step 1: Écrire les tests d'abord**

```typescript
// __tests__/hooks/useReemUIPersistence.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReemUIPersistence, REEM_UI_KEY } from '@/hooks/useReemUIPersistence'
import { EMPTY_REEM_UI } from '@/lib/reem-types'

describe('useReemUIPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialise avec EMPTY_REEM_UI quand localStorage est vide', () => {
    const { result } = renderHook(() => useReemUIPersistence())
    expect(result.current.state).toEqual(EMPTY_REEM_UI)
  })

  it('restaure depuis localStorage un état valide', () => {
    localStorage.setItem(REEM_UI_KEY, JSON.stringify({
      visibility: 'hidden',
      draftMessage: 'hello world',
    }))
    const { result } = renderHook(() => useReemUIPersistence())
    expect(result.current.state.visibility).toBe('hidden')
    expect(result.current.state.draftMessage).toBe('hello world')
  })

  it('ignore un état localStorage corrompu et tombe sur EMPTY_REEM_UI', () => {
    localStorage.setItem(REEM_UI_KEY, JSON.stringify({ garbage: 1 }))
    const { result } = renderHook(() => useReemUIPersistence())
    expect(result.current.state).toEqual(EMPTY_REEM_UI)
  })

  it('persiste dans localStorage avec debounce 300ms', () => {
    const { result } = renderHook(() => useReemUIPersistence())
    act(() => {
      result.current.setState({ visibility: 'panel-open', draftMessage: 'typing' })
    })
    expect(localStorage.getItem(REEM_UI_KEY)).toBeNull()
    act(() => { vi.advanceTimersByTime(300) })
    const stored = JSON.parse(localStorage.getItem(REEM_UI_KEY)!)
    expect(stored.visibility).toBe('panel-open')
    expect(stored.draftMessage).toBe('typing')
  })

  it('setState accepte un updater fonctionnel', () => {
    const { result } = renderHook(() => useReemUIPersistence())
    act(() => {
      result.current.setState({ visibility: 'panel-open', draftMessage: '' })
      result.current.setState(prev => ({ ...prev, draftMessage: prev.draftMessage + 'hi' }))
    })
    expect(result.current.state.draftMessage).toBe('hi')
    expect(result.current.state.visibility).toBe('panel-open')
  })
})
```

- [ ] **Step 2: Run pour vérifier échec**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npx vitest run __tests__/hooks/useReemUIPersistence.test.tsx`
Expected: FAIL (module `@/hooks/useReemUIPersistence` introuvable)

- [ ] **Step 3: Implémenter le hook**

```typescript
// hooks/useReemUIPersistence.ts
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { EMPTY_REEM_UI, type ReemUIState, type ReemVisibility } from '@/lib/reem-types'

export const REEM_UI_KEY = 'reem.ui'
const DEBOUNCE_MS = 300

const VALID_VISIBILITIES: ReemVisibility[] = ['bubble', 'panel-open', 'hidden']

function isReemUIStateLike(value: unknown): value is ReemUIState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.visibility === 'string' &&
    VALID_VISIBILITIES.includes(v.visibility as ReemVisibility) &&
    typeof v.draftMessage === 'string'
  )
}

function loadFromStorage(): ReemUIState {
  try {
    const raw = localStorage.getItem(REEM_UI_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isReemUIStateLike(parsed)) return parsed
    }
  } catch (err) {
    console.warn('[reem] localStorage indisponible à la lecture:', err)
  }
  return EMPTY_REEM_UI
}

type StateUpdater = ReemUIState | ((prev: ReemUIState) => ReemUIState)

function isFunctionalUpdater(v: StateUpdater): v is (prev: ReemUIState) => ReemUIState {
  return typeof v === 'function'
}

export function useReemUIPersistence(): {
  state: ReemUIState
  setState: (next: StateUpdater) => void
} {
  const [state, setInternalState] = useState<ReemUIState>(() => loadFromStorage())
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
    }
  }, [])

  const setState = useCallback((next: StateUpdater) => {
    setInternalState(prev => {
      const resolved = isFunctionalUpdater(next) ? next(prev) : next

      if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
      writeTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(REEM_UI_KEY, JSON.stringify(resolved))
        } catch (err) {
          console.warn('[reem] localStorage indisponible à l\'écriture:', err)
        }
      }, DEBOUNCE_MS)

      return resolved
    })
  }, [])

  return { state, setState }
}
```

- [ ] **Step 4: Run tests → PASS**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npx vitest run __tests__/hooks/useReemUIPersistence.test.tsx`
Expected: 5 tests passing

- [ ] **Step 5: Run full suite**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm test`
Expected: 37 tests passing (32 existants + 5 nouveaux)

- [ ] **Step 6: Lint + typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 7: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add hooks/useReemUIPersistence.ts __tests__/hooks/useReemUIPersistence.test.tsx
git commit -m "feat(reem): hook useReemUIPersistence avec debounce 300ms

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Hook `useReemContext`

**Files:**
- Create: `hooks/useReemContext.ts`

- [ ] **Step 1: Créer le hook**

```typescript
// hooks/useReemContext.ts
'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useClientContext } from '@/hooks/useClientContext'
import type { ReemContext } from '@/lib/reem-types'

function derivePageLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/dashboard/clients') return 'Clients'
  if (pathname.startsWith('/dashboard/clients/')) return 'Fiche client'
  if (pathname.startsWith('/dashboard/invoices')) return 'Facturation'
  if (pathname === '/dashboard/workspace') return 'Workspace'
  if (pathname === '/dashboard/chat') return 'Chat interne'
  return 'Dashboard'
}

export function useReemContext(): ReemContext {
  const pathname = usePathname() ?? '/dashboard'
  const { selectedClientId } = useClientContext()

  return useMemo<ReemContext>(() => ({
    pathname,
    pageLabel: derivePageLabel(pathname),
    activeClientId: selectedClientId,
  }), [pathname, selectedClientId])
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 3: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add hooks/useReemContext.ts
git commit -m "feat(reem): hook useReemContext pour l'injection du contexte page

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Dictionnaire `reem-suggestions`

**Files:**
- Create: `lib/reem-suggestions.ts`
- Create: `__tests__/lib/reem-suggestions.test.ts`

- [ ] **Step 1: Écrire les tests d'abord**

```typescript
// __tests__/lib/reem-suggestions.test.ts
import { describe, it, expect } from 'vitest'
import { getSuggestions } from '@/lib/reem-suggestions'

describe('getSuggestions', () => {
  it('retourne les suggestions dashboard pour /dashboard', () => {
    const result = getSuggestions('/dashboard')
    expect(result).toContain('💡 Résume-moi ce mois')
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('retourne les suggestions fiche client pour /dashboard/clients/xxx', () => {
    const result = getSuggestions('/dashboard/clients/ecodistrib-id')
    expect(result.some(s => s.includes('Historique'))).toBe(true)
    expect(result.some(s => s.includes('relance'))).toBe(true)
  })

  it('retourne les suggestions Workspace pour /dashboard/workspace', () => {
    const result = getSuggestions('/dashboard/workspace')
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('retourne le fallback pour un pathname inconnu', () => {
    const result = getSuggestions('/some/unknown/path')
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.some(s => s.includes('Résume'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run pour vérifier échec**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npx vitest run __tests__/lib/reem-suggestions.test.ts`
Expected: FAIL (module introuvable)

- [ ] **Step 3: Implémenter**

```typescript
// lib/reem-suggestions.ts

const DASHBOARD_SUGGESTIONS = [
  '💡 Résume-moi ce mois',
  '⚠️ Paiements en retard ?',
  '📊 Top clients du trimestre',
]

const CLIENT_PAGE_SUGGESTIONS = [
  '📈 Historique de ce client',
  '✉️ Rédiger une relance',
  '➕ Nouvelle commission',
]

const INVOICES_SUGGESTIONS = [
  '🧾 Résumer la facturation de ce mois',
  '💡 Quelles factures marquer comme payées ?',
]

const WORKSPACE_SUGGESTIONS = [
  '✉️ Reformuler plus professionnel',
  '💡 Suggérer un objet',
  '🔍 Corriger le ton',
  '🔍 Trouver un fichier Drive',
]

const FALLBACK_SUGGESTIONS = [
  '💡 Résume-moi ce mois',
  '⚠️ Que dois-je traiter en priorité ?',
]

export function getSuggestions(pathname: string): string[] {
  if (pathname === '/dashboard') return DASHBOARD_SUGGESTIONS
  if (pathname.startsWith('/dashboard/clients')) return CLIENT_PAGE_SUGGESTIONS
  if (pathname.startsWith('/dashboard/invoices')) return INVOICES_SUGGESTIONS
  if (pathname.startsWith('/dashboard/workspace')) return WORKSPACE_SUGGESTIONS
  return FALLBACK_SUGGESTIONS
}
```

- [ ] **Step 4: Run tests → PASS**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npx vitest run __tests__/lib/reem-suggestions.test.ts`
Expected: 4 tests passing

- [ ] **Step 5: Lint + typecheck + full test suite**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit && npm test`
Expected: 0 erreur, 41 tests passing (32 + 5 + 4)

- [ ] **Step 6: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add lib/reem-suggestions.ts __tests__/lib/reem-suggestions.test.ts
git commit -m "feat(reem): dictionnaire getSuggestions par pathname

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Refonte `lib/agent-tools.ts` (V1)

**Files:**
- Modify: `lib/agent-tools.ts` (réécriture complète)

- [ ] **Step 1: Lire le fichier actuel pour référence**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && cat lib/agent-tools.ts`

Observe que les 9 tools actuels seront remplacés par 6.

- [ ] **Step 2: Réécrire le fichier**

Remplacer l'intégralité de `lib/agent-tools.ts` par :

```typescript
import type Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import type { ReemContext } from '@/lib/reem-types'

export interface AgentToolResult {
  type: 'data' | 'draft_email' | 'navigation'
  result: unknown
}

export interface AgentContext {
  clientId: string | null
  userId: string
  googleAccessToken: string | null
  pageContext?: ReemContext
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_data',
    description: 'Lire des données de l\'application. Choisir entity parmi: commissions, paiements, clients, sommes_dues, primes, activity. Filters optionnels (client_id, status, mois, limit).',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity: {
          type: 'string',
          enum: ['commissions', 'paiements', 'clients', 'sommes_dues', 'primes', 'activity'],
          description: 'Type d\'entité à interroger',
        },
        filters: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            status: { type: 'string' },
            mois: { type: 'string', description: 'Format YYYY-MM' },
            limit: { type: 'number', description: 'Max 50' },
          },
        },
      },
      required: ['entity'],
    },
  },
  {
    name: 'get_overdue_payments',
    description: 'Récupérer les paiements en retard (statut en_retard ou en_attente) depuis plus de threshold_days jours. Utile pour rédiger des relances ciblées.',
    input_schema: {
      type: 'object' as const,
      properties: {
        threshold_days: { type: 'number', description: 'Seuil en jours (défaut 30)' },
        client_id: { type: 'string', description: 'Filtrer par client' },
      },
      required: [],
    },
  },
  {
    name: 'summarize_period',
    description: 'Générer une synthèse narrative chiffrée d\'une période. Utilise cet outil pour "résume-moi le mois" ou "que s\'est-il passé cette semaine".',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: { type: 'string', enum: ['week', 'month', 'quarter'], description: 'Période à résumer' },
        client_id: { type: 'string', description: 'Filtrer par client' },
      },
      required: ['period'],
    },
  },
  {
    name: 'search_drive',
    description: 'Rechercher des fichiers dans Google Drive par nom.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Terme de recherche' },
      },
      required: ['query'],
    },
  },
  {
    name: 'draft_email',
    description: 'Préparer un brouillon d\'email (libre ou relance). Retourne un lien que l\'utilisateur peut cliquer pour ouvrir le tiroir Workspace pré-rempli.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Destinataire (email)' },
        subject: { type: 'string', description: 'Objet' },
        body: { type: 'string', description: 'Corps du message (texte brut, retours à la ligne OK)' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'propose_navigation',
    description: 'Proposer à l\'utilisateur d\'ouvrir une page spécifique de l\'application. Retourne un lien cliquable que l\'utilisateur doit activer lui-même. Ne navigue jamais automatiquement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pathname: { type: 'string', description: 'Chemin Next.js (ex: /dashboard/clients/ecodistrib-id)' },
        label: { type: 'string', description: 'Libellé affiché sur le chip (ex: ECODISTRIB)' },
      },
      required: ['pathname', 'label'],
    },
  },
]

async function getPeriodBounds(period: 'week' | 'month' | 'quarter'): Promise<{ from: string; to: string }> {
  const to = new Date()
  const from = new Date()
  if (period === 'week') from.setDate(from.getDate() - 7)
  else if (period === 'month') from.setMonth(from.getMonth() - 1)
  else from.setMonth(from.getMonth() - 3)
  return { from: from.toISOString(), to: to.toISOString() }
}

export async function executeAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  context: AgentContext,
): Promise<AgentToolResult> {
  const effectiveClientId =
    (input.client_id as string | undefined) ??
    ((input.filters as Record<string, unknown> | undefined)?.client_id as string | undefined) ??
    context.clientId

  switch (toolName) {
    case 'query_data': {
      const entity = String(input.entity)
      const filters = (input.filters ?? {}) as Record<string, unknown>
      const limit = Math.min(Number(filters.limit) || 20, 50)

      if (entity === 'commissions') {
        let q = supabaseAdmin
          .from('commissions')
          .select('*, prime:primes(name, color)')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        if (filters.status) q = q.eq('status', String(filters.status))
        if (filters.mois) q = q.eq('mois', String(filters.mois))
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'paiements') {
        let q = supabaseAdmin.from('paiements').select('*').order('date', { ascending: false }).limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        if (filters.status) q = q.eq('status', String(filters.status))
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'clients') {
        const { data, error } = await supabaseAdmin.from('clients').select('*').order('name').limit(limit)
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'sommes_dues') {
        let q = supabaseAdmin.from('sommes_dues').select('*').limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'primes') {
        let q = supabaseAdmin.from('primes').select('*').order('name').limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'activity') {
        const { data, error } = await supabaseAdmin
          .from('activity_log')
          .select('*, user:users(display_name)')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      throw new Error(`Entity inconnue: ${entity}`)
    }

    case 'get_overdue_payments': {
      const thresholdDays = Number(input.threshold_days) || 30
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - thresholdDays)

      let q = supabaseAdmin
        .from('paiements')
        .select('*, client:clients(name)')
        .in('status', ['en_retard', 'en_attente'])
        .lt('date', cutoff.toISOString().slice(0, 10))
        .order('date', { ascending: true })
      if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'summarize_period': {
      const period = String(input.period) as 'week' | 'month' | 'quarter'
      const { from, to } = await getPeriodBounds(period)

      let commQ = supabaseAdmin.from('commissions').select('*').gte('created_at', from).lte('created_at', to)
      let payQ = supabaseAdmin.from('paiements').select('*').gte('date', from.slice(0, 10)).lte('date', to.slice(0, 10))
      if (effectiveClientId) {
        commQ = commQ.eq('client_id', effectiveClientId)
        payQ = payQ.eq('client_id', effectiveClientId)
      }
      const [commissions, paiements] = await Promise.all([commQ, payQ])
      if (commissions.error) throw new Error(commissions.error.message)
      if (paiements.error) throw new Error(paiements.error.message)

      const totalCA = (commissions.data ?? []).reduce((sum, c) => sum + (Number(c.ca) || 0), 0)
      const totalCommissions = (commissions.data ?? []).reduce((sum, c) => sum + (Number(c.commission) || 0), 0)
      const paidCount = (paiements.data ?? []).filter(p => p.status === 'effectue').length
      const overdueCount = (paiements.data ?? []).filter(p => p.status === 'en_retard').length

      return {
        type: 'data',
        result: {
          period,
          from,
          to,
          stats: {
            commissions_count: commissions.data?.length ?? 0,
            ca_total: totalCA,
            commission_total: totalCommissions,
            paiements_effectues: paidCount,
            paiements_en_retard: overdueCount,
          },
          commissions: commissions.data,
          paiements: paiements.data,
        },
      }
    }

    case 'search_drive': {
      if (!context.googleAccessToken) {
        return { type: 'data', result: { error: 'Non connecté à Google Drive.' } }
      }
      const q = encodeURIComponent(`name contains '${String(input.query).replace(/'/g, "\\'")}'`)
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&pageSize=10`,
        { headers: { Authorization: `Bearer ${context.googleAccessToken}` } },
      )
      if (!res.ok) {
        return { type: 'data', result: { error: `Erreur Drive : ${res.status}` } }
      }
      const json = await res.json() as { files: unknown[] }
      return { type: 'data', result: json.files }
    }

    case 'draft_email': {
      return {
        type: 'draft_email',
        result: {
          to: String(input.to),
          subject: String(input.subject),
          body: String(input.body),
        },
      }
    }

    case 'propose_navigation': {
      return {
        type: 'navigation',
        result: {
          pathname: String(input.pathname),
          label: String(input.label),
        },
      }
    }

    default:
      throw new Error(`Outil inconnu : ${toolName}`)
  }
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | tail -20`

**Important :** le typecheck va afficher des erreurs dans `app/api/agent/chat/route.ts`, `hooks/useAgentMessages.ts`, `components/agent/AgentMessage.tsx` — elles référencent des tools / méthodes supprimés (`confirmAction`, `create_commission`, etc.). C'est **attendu**, on corrige dans les tasks suivantes.

**Condition d'acceptation :** seul `lib/agent-tools.ts` ne doit plus avoir d'erreur. Les autres fichiers peuvent en avoir temporairement.

- [ ] **Step 4: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add lib/agent-tools.ts
git commit -m "refactor(reem): agent-tools V1 — 6 tools read-only + propose_navigation

Suppression des tools d'écriture (create_commission, create_paiement) et
fusion des 5 query_* en un query_data unifié. Ajout de get_overdue_payments,
summarize_period et propose_navigation. AgentContext étendu avec
pageContext pour l'injection du contexte de page courante.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Mise à jour `/api/agent/chat/route.ts`

**Files:**
- Modify: `app/api/agent/chat/route.ts`

- [ ] **Step 1: Lire le fichier actuel**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && cat app/api/agent/chat/route.ts`

- [ ] **Step 2: Réécrire le fichier**

Remplacer intégralement par :

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { AGENT_TOOLS, executeAgentTool } from '@/lib/agent-tools'
import type { ReemContext } from '@/lib/reem-types'

const BASE_SYSTEM_PROMPT =
  'Tu es Reem AI, l\'assistante intelligente de LR Consulting W.L.L, basée au Royaume de Bahreïn. ' +
  'Tu parles toujours en français. Tu peux interroger les données (query_data), identifier les retards de paiement ' +
  '(get_overdue_payments), synthétiser une période (summarize_period), chercher dans Google Drive, rédiger des brouillons ' +
  'd\'email (draft_email) qui s\'ouvriront dans le tiroir Workspace de l\'utilisateur, et proposer des liens de navigation ' +
  '(propose_navigation) que l\'utilisateur clique lui-même. ' +
  '\n\n' +
  'IMPORTANT : tu ne peux PAS créer, modifier ou supprimer de données directement (pas de tools d\'écriture en V1). ' +
  'Quand tu veux aider l\'utilisateur à créer une commission ou un paiement, propose-lui un lien vers la page correspondante ' +
  'via propose_navigation et laisse-le faire lui-même. Pour rédiger un email, utilise draft_email qui ouvrira ' +
  'le tiroir du Workspace pré-rempli. ' +
  '\n\n' +
  'Utilise le format français pour les chiffres (espaces, €). Sois concise et professionnelle.'

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  context: z.object({
    pathname: z.string(),
    pageLabel: z.string(),
    activeClientId: z.string().nullable(),
    selectedEntity: z.object({
      type: z.enum(['client', 'commission', 'paiement', 'invoice', 'email_draft']),
      id: z.string().optional(),
      preview: z.string().optional(),
    }).optional(),
  }).optional(),
})

function buildSystemPrompt(context?: ReemContext): string {
  if (!context) return BASE_SYSTEM_PROMPT
  const lines = [
    BASE_SYSTEM_PROMPT,
    '',
    'Contexte utilisateur courant :',
    `- Page : ${context.pageLabel} (${context.pathname})`,
    context.activeClientId
      ? `- Client actif : ${context.activeClientId}`
      : '- Client actif : aucun',
  ]
  if (context.selectedEntity) {
    lines.push(`- Entité en cours : ${context.selectedEntity.type}${context.selectedEntity.preview ? ` — ${context.selectedEntity.preview}` : ''}`)
  }
  lines.push('')
  lines.push('Prends ce contexte en compte. Quand l\'utilisateur dit "ce client", "cette facture", "ce mail", réfère-toi à l\'entité en cours.')
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { message, context } = parsed.data

    await supabaseAdmin.from('agent_messages').insert({
      user_id: session.id,
      role: 'user',
      content: message,
    })

    const { data: history } = await supabaseAdmin
      .from('agent_messages')
      .select('role, content, tool_data')
      .eq('user_id', session.id)
      .order('created_at', { ascending: true })
      .limit(30)

    const messages: Anthropic.MessageParam[] = (history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    let googleAccessToken: string | null = null
    try {
      const cookieHeader = req.headers.get('cookie') ?? ''
      const match = cookieHeader.match(/google_tokens=([^;]+)/)
      if (match) {
        const tokens = JSON.parse(decodeURIComponent(match[1])) as { access_token?: string }
        googleAccessToken = tokens.access_token ?? null
      }
    } catch {
      // No Google tokens available
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API Anthropic non configurée.' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })
    const agentContext = {
      clientId: context?.activeClientId ?? null,
      userId: session.id,
      googleAccessToken,
      pageContext: context,
    }

    const systemPrompt = buildSystemPrompt(context)

    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    })

    const toolData: Array<{ tool: string; type: string; result: unknown }> = []

    while (response.stop_reason === 'tool_use') {
      const assistantContent = response.content
      const toolUseBlocks = assistantContent.filter((b) => b.type === 'tool_use')

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue
        try {
          const result = await executeAgentTool(block.name, block.input as Record<string, unknown>, agentContext)
          toolData.push({ tool: block.name, type: result.type, result: result.result })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Erreur inconnue'
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: errMsg }),
            is_error: true,
          })
        }
      }

      messages.push({ role: 'assistant', content: assistantContent })
      messages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools: AGENT_TOOLS,
        messages,
      })
    }

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    )
    const content = textBlocks.map((b) => b.text).join('\n')

    await supabaseAdmin.from('agent_messages').insert({
      user_id: session.id,
      role: 'assistant',
      content,
      tool_data: toolData.length > 0 ? toolData : null,
    })

    return NextResponse.json({ content, tool_data: toolData })
  } catch {
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | tail -15`

Il reste des erreurs attendues dans `hooks/useAgentMessages.ts`, `components/agent/AgentMessage.tsx`, `app/dashboard/agent/page.tsx`. On les corrige dans les tasks suivantes.

- [ ] **Step 4: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add app/api/agent/chat/route.ts
git commit -m "refactor(reem): /api/agent/chat accepte context + prompt enrichi V1

Le endpoint accepte maintenant un objet context (pathname, pageLabel,
activeClientId, selectedEntity optionnelle) qui est injecté dans le
prompt système et dans AgentContext pour que les tools puissent s'en
servir. Prompt système explicite que la V1 est read-only : pas de
création/modification directe en DB.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Mise à jour `hooks/useAgentMessages.ts`

**Files:**
- Modify: `hooks/useAgentMessages.ts`

- [ ] **Step 1: Lire le fichier**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && cat hooks/useAgentMessages.ts`

- [ ] **Step 2: Réécrire**

Remplacer intégralement par :

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReemContext } from '@/lib/reem-types'

export interface AgentMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string | null
  tool_data: { type: string; result: unknown }[] | null
  created_at: string
}

export function useAgentMessages(userId: string | undefined) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as AgentMessage[])
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const sendMessage = useCallback(async (message: string, context: ReemContext) => {
    if (!userId) return
    setSending(true)

    const optimistic: AgentMessage = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      role: 'user',
      content: message,
      tool_data: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      })
      await load()
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }, [userId, load])

  const clearHistory = useCallback(async () => {
    if (!userId) return
    try {
      await fetch('/api/agent/clear', { method: 'DELETE' })
      setMessages([])
    } catch {
      // silencieux
    }
  }, [userId])

  return { messages, loading, sending, sendMessage, clearHistory, reload: load }
}
```

> **Changement clé :** `sendMessage` prend maintenant `(message, context: ReemContext)` au lieu de `(message, clientId)`. Le hook `confirmAction` est supprimé (plus utilisé en V1).

- [ ] **Step 3: Lint + typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | tail -15`

Erreurs restantes attendues dans `components/agent/AgentMessage.tsx` (référence `onConfirm`) et `app/dashboard/agent/page.tsx` (utilise l'ancienne API). On les supprime en Task 14.

- [ ] **Step 4: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add hooks/useAgentMessages.ts
git commit -m "refactor(reem): useAgentMessages.sendMessage accepte ReemContext

sendMessage prend maintenant (message, context: ReemContext) qui est
transmis au POST /api/agent/chat. Suppression de confirmAction (plus
utilisée en V1, zero tool d'écriture en DB).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — `ReemBubble` + `ReemPullTab`

**Files:**
- Create: `components/reem/ReemBubble.tsx`
- Create: `components/reem/ReemPullTab.tsx`

- [ ] **Step 1: Créer le dossier et ReemBubble**

```bash
mkdir -p /Users/hugueshenridelpit/commission-tracker/commission-tracker/components/reem
```

```typescript
// components/reem/ReemBubble.tsx
'use client'

interface ReemBubbleProps {
  onClick: () => void
  onHide: () => void
}

export default function ReemBubble({ onClick, onHide }: ReemBubbleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onHide() }}
      aria-label="Ouvrir Reem AI (clic-droit pour masquer)"
      title="Reem AI — clic pour ouvrir, clic-droit pour masquer"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(99,102,241,0.45), 0 0 0 4px rgba(99,102,241,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      <span
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#22c55e',
          border: '2px solid #07080d',
        }}
      />
    </button>
  )
}
```

- [ ] **Step 2: Créer ReemPullTab**

```typescript
// components/reem/ReemPullTab.tsx
'use client'

interface ReemPullTabProps {
  onClick: () => void
}

export default function ReemPullTab({ onClick }: ReemPullTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ressortir Reem AI"
      title="Ressortir Reem AI"
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '22px',
        height: '60px',
        background: 'rgba(99,102,241,0.18)',
        borderTop: '1px solid rgba(99,102,241,0.4)',
        borderLeft: '1px solid rgba(99,102,241,0.4)',
        borderBottom: '1px solid rgba(99,102,241,0.4)',
        borderRight: 'none',
        borderTopLeftRadius: '8px',
        borderBottomLeftRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        zIndex: 40,
        color: '#818cf8',
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.28)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)' }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>R</span>
    </button>
  )
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | grep -v "app/dashboard/agent" | grep -v "components/agent/AgentMessage" | tail -10`

Les erreurs dans l'ancienne page agent sont attendues, on les filtre.

- [ ] **Step 4: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add components/reem/ReemBubble.tsx components/reem/ReemPullTab.tsx
git commit -m "feat(reem): ReemBubble (54px bas-droite) + ReemPullTab (bord droit)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — `ReemPanel` (cœur du widget)

**Files:**
- Create: `components/reem/ReemPanel.tsx`

- [ ] **Step 1: Créer le fichier**

```typescript
// components/reem/ReemPanel.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAgentMessages } from '@/hooks/useAgentMessages'
import { useReemContext } from '@/hooks/useReemContext'
import { getSuggestions } from '@/lib/reem-suggestions'
import { avatarInitials } from '@/lib/utils'
import AgentMessageComponent from '@/components/agent/AgentMessage'
import AgentInput from '@/components/agent/AgentInput'

interface ReemPanelProps {
  onClose: () => void
  onHide: () => void
  draftMessage: string
  onDraftChange: (next: string) => void
}

export default function ReemPanel({ onClose, onHide, draftMessage, onDraftChange }: ReemPanelProps) {
  const { user } = useAuth()
  const context = useReemContext()
  const { messages, sending, sendMessage, clearHistory } = useAgentMessages(user?.id)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displayName = user?.display_name ?? ''
  const initials = displayName ? avatarInitials(displayName) : 'U'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = (message: string) => {
    sendMessage(message, context)
    onDraftChange('')
  }

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion, context)
  }

  const suggestions = getSuggestions(context.pathname)
  const showSuggestions = messages.length === 0 && !sending && !showHistory

  return (
    <div
      role="dialog"
      aria-label="Reem AI — assistante"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: 'min(380px, calc(100vw - 40px))',
        height: 'min(540px, calc(100vh - 40px))',
        backgroundColor: '#0f1117',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '14px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 6px rgba(99,102,241,0.05)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8edf5', lineHeight: 1.2 }}>Reem AI</div>
            <div style={{ fontSize: '10px', color: '#8898aa', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              contexte : {context.pageLabel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowHistory(prev => !prev)}
            aria-label={showHistory ? 'Fermer l\'historique' : 'Voir l\'historique'}
            title={showHistory ? 'Chat' : 'Historique'}
            style={{
              background: showHistory ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: 'none',
              color: showHistory ? '#818cf8' : '#8898aa',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            📋
          </button>
          <button
            type="button"
            onClick={onHide}
            aria-label="Masquer complètement Reem"
            title="Masquer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8898aa',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            👁
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            title="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8898aa',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {showHistory ? (
          <div>
            <div style={{ fontSize: '11px', color: '#8898aa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Historique — {messages.length} messages
            </div>
            {messages.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#3d4f63' }}>Aucun historique</div>
            ) : (
              <button
                type="button"
                onClick={clearHistory}
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.2)',
                  borderRadius: '6px',
                  color: '#f43f5e',
                  padding: '6px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Effacer tout l'historique
              </button>
            )}
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <AgentMessageComponent
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  toolData={m.tool_data}
                  userName={displayName}
                  userInitials={initials}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div>
            <div
              style={{
                fontSize: '13px',
                color: '#e8edf5',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '14px',
              }}
            >
              Bonjour {displayName.split(' ')[0] || ''} 👋<br />
              <span style={{ color: '#8898aa', fontSize: '12px' }}>Comment puis-je t'aider ?</span>
            </div>
            {showSuggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#8898aa',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
                      e.currentTarget.style.color = '#e8edf5'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                      e.currentTarget.style.color = '#8898aa'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map(m => (
              <AgentMessageComponent
                key={m.id}
                role={m.role}
                content={m.content}
                toolData={m.tool_data}
                userName={displayName}
                userInitials={initials}
              />
            ))}
            {sending && (
              <div style={{ fontSize: '12px', color: '#8898aa', fontStyle: 'italic' }}>Reem réfléchit…</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {!showHistory && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <AgentInput
            onSend={handleSend}
            disabled={sending}
            value={draftMessage}
            onChange={onDraftChange}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Adapter `AgentInput` si nécessaire**

Le composant `AgentInput` existant doit accepter `value` et `onChange` en plus de `onSend`. Lire d'abord :

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && cat components/agent/AgentInput.tsx`

Si `AgentInput` n'accepte pas déjà ces props, l'adapter pour passer en mode contrôlé. La signature cible est :

```typescript
interface AgentInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  value?: string
  onChange?: (next: string) => void
}
```

Le composant doit fonctionner en **deux modes** :
- Si `value` et `onChange` fournis → mode contrôlé
- Sinon → mode interne (useState local) pour ne pas casser un éventuel usage résiduel

Si le refactor est nécessaire, le faire maintenant dans le même commit.

- [ ] **Step 3: Adapter `AgentMessage.tsx` pour retirer `onConfirm`**

Le composant actuel accepte une prop `onConfirm` qui n'est plus utilisée en V1. Lire et retirer la prop (et toute UI liée aux confirm blocks pour les actions `create_commission` / `create_paiement`).

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && grep -n "onConfirm\|confirm" components/agent/AgentMessage.tsx`

Retirer la prop et le rendering associé (bloc `type === 'confirm'`). Garder le rendering de `data`, `draft_email` et ajouter le rendering de `navigation` :

Dans le rendering des `tool_data`, ajouter un cas pour `type === 'navigation'` qui affiche un chip cliquable :

```typescript
// Dans AgentMessage.tsx, dans le block qui rend toolData[i].type :
if (type === 'navigation') {
  const data = item.result as { pathname: string; label: string }
  return (
    <a
      href={data.pathname}
      key={i}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        background: 'rgba(99,102,241,0.12)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '8px',
        color: '#818cf8',
        textDecoration: 'none',
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      → {data.label}
    </a>
  )
}
```

- [ ] **Step 4: Lint + typecheck + tests**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | grep -v "app/dashboard/agent" | tail -15 && npm test`

Expected : seule l'ancienne page `/dashboard/agent` peut avoir des erreurs résiduelles (supprimée en Task 14). Tous les tests doivent passer.

- [ ] **Step 5: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add components/reem/ReemPanel.tsx components/agent/AgentInput.tsx components/agent/AgentMessage.tsx
git commit -m "feat(reem): ReemPanel — panneau flottant 380×540 avec historique

Le panneau réutilise AgentMessage et AgentInput (passés en mode contrôlé).
Header avec contexte, suggestions par page, vue historique basculable.
AgentMessage voit retiré le support des confirm blocks (create_*), ajout
du rendering pour tool type 'navigation' (chip cliquable propose_navigation).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — `ReemWidget` orchestrateur + montage global

**Files:**
- Create: `components/reem/ReemWidget.tsx`
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Créer ReemWidget**

```typescript
// components/reem/ReemWidget.tsx
'use client'

import { useEffect, useCallback } from 'react'
import { useReemUIPersistence } from '@/hooks/useReemUIPersistence'
import ReemBubble from './ReemBubble'
import ReemPullTab from './ReemPullTab'
import ReemPanel from './ReemPanel'

export default function ReemWidget() {
  const { state, setState } = useReemUIPersistence()

  const openPanel = useCallback(() => {
    setState(prev => ({ ...prev, visibility: 'panel-open' }))
  }, [setState])

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, visibility: 'bubble' }))
  }, [setState])

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visibility: 'hidden' }))
  }, [setState])

  const showFromHidden = useCallback(() => {
    setState(prev => ({ ...prev, visibility: 'bubble' }))
  }, [setState])

  const setDraft = useCallback((next: string) => {
    setState(prev => ({ ...prev, draftMessage: next }))
  }, [setState])

  // Raccourci ⌘L / Ctrl+L : cycle 3 états
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        // Vérifie qu'on n'est pas dans un input (sinon ⌘L de focus URL bar reste fonctionnel)
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        setState(prev => {
          if (prev.visibility === 'hidden') return { ...prev, visibility: 'bubble' }
          if (prev.visibility === 'bubble') return { ...prev, visibility: 'panel-open' }
          return { ...prev, visibility: 'bubble' }
        })
      }
      // Escape referme le panneau
      if (e.key === 'Escape' && state.visibility === 'panel-open') {
        setState(prev => ({ ...prev, visibility: 'bubble' }))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setState, state.visibility])

  return (
    <>
      {state.visibility === 'hidden' && <ReemPullTab onClick={showFromHidden} />}
      {state.visibility === 'bubble' && <ReemBubble onClick={openPanel} onHide={hide} />}
      {state.visibility === 'panel-open' && (
        <ReemPanel
          onClose={closePanel}
          onHide={hide}
          draftMessage={state.draftMessage}
          onDraftChange={setDraft}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Monter dans le layout dashboard**

Lire le layout actuel :

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && cat app/dashboard/layout.tsx`

Ajouter `<ReemWidget />` en import et dans le JSX après `{children}`. Ci-dessous un exemple typique ; adapter selon la structure réelle du fichier :

```typescript
import ReemWidget from '@/components/reem/ReemWidget'

// ... dans le return du composant layout, après {children} :
<ReemWidget />
```

- [ ] **Step 3: Lint + typecheck + tests**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | grep -v "app/dashboard/agent" | tail -15 && npm test`

- [ ] **Step 4: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add components/reem/ReemWidget.tsx app/dashboard/layout.tsx
git commit -m "feat(reem): ReemWidget orchestrateur 3-états + montage global

Le widget est monté une seule fois dans app/dashboard/layout.tsx et
survit aux navigations de page. Gestion du cycle bulle → panneau → bulle
via clic ou raccourci Cmd+L / Ctrl+L. Escape referme le panneau.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — Route `/api/agent/insights` (LLM-powered)

**Files:**
- Create: `app/api/agent/insights/route.ts`

- [ ] **Step 1: Créer la route**

```typescript
// app/api/agent/insights/route.ts
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Insight } from '@/lib/reem-types'

const INSIGHTS_TOOL: Anthropic.Tool = {
  name: 'return_insights',
  description: 'Retourne jusqu\'à 3 insights actionnables sur l\'activité récente de l\'utilisateur.',
  input_schema: {
    type: 'object' as const,
    properties: {
      insights: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Identifiant unique (slug)' },
            severity: { type: 'string', enum: ['info', 'warning', 'alert'] },
            icon: { type: 'string', description: 'Un emoji (ex: ⚠️, 💡, 📊)' },
            title: { type: 'string', description: 'Titre court max 8 mots' },
            description: { type: 'string', description: 'Une phrase précise avec chiffres' },
            actionLabel: { type: 'string', description: 'Libellé du bouton d\'action' },
            actionPrompt: { type: 'string', description: 'Prompt exact à envoyer à Reem au clic' },
          },
          required: ['id', 'severity', 'icon', 'title', 'description', 'actionLabel', 'actionPrompt'],
        },
      },
    },
    required: ['insights'],
  },
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const cutoff = ninetyDaysAgo.toISOString()
    const cutoffDate = cutoff.slice(0, 10)

    const [commRes, payRes, sommesRes, clientsRes] = await Promise.all([
      supabaseAdmin.from('commissions').select('*, prime:primes(name)').gte('created_at', cutoff),
      supabaseAdmin.from('paiements').select('*, client:clients(name)').gte('date', cutoffDate),
      supabaseAdmin.from('sommes_dues').select('*, client:clients(name)'),
      supabaseAdmin.from('clients').select('id, name'),
    ])

    if (commRes.error || payRes.error || sommesRes.error || clientsRes.error) {
      return NextResponse.json({ insights: [] })
    }

    const dataSummary = {
      commissions: commRes.data,
      paiements: payRes.data,
      sommes_dues: sommesRes.data,
      clients: clientsRes.data,
      period: `90 derniers jours à partir du ${cutoffDate}`,
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ insights: [] })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:
        'Tu es un analyste business pour LR Consulting W.L.L. Analyse les données fournies et identifie ' +
        'jusqu\'à 3 insights actionnables. Un bon insight : est spécifique (chiffres précis), est utile ' +
        '(action claire), est non-trivial (pas "tout va bien"). Priorise : retards de paiement critiques, ' +
        'anomalies d\'activité (mois sans commissions), opportunités de relance. Retourne STRICTEMENT via ' +
        'l\'outil return_insights. Titre max 8 mots. Description 1 phrase avec chiffres. actionPrompt doit ' +
        'être un message que l\'utilisateur enverrait à Reem AI en langage naturel français.',
      tools: [INSIGHTS_TOOL],
      tool_choice: { type: 'tool', name: 'return_insights' },
      messages: [
        {
          role: 'user',
          content: `Voici les données de mon activité sur les 90 derniers jours :\n\n${JSON.stringify(dataSummary, null, 2)}\n\nIdentifie jusqu'à 3 insights actionnables.`,
        },
      ],
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ insights: [] })
    }

    const parsed = toolUse.input as { insights?: Insight[] }
    const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : []

    return NextResponse.json({ insights })
  } catch {
    return NextResponse.json({ insights: [] })
  }
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | grep -v "app/dashboard/agent" | tail -10`

- [ ] **Step 3: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add app/api/agent/insights/route.ts
git commit -m "feat(reem): route GET /api/agent/insights LLM-powered

Claude analyse 90 jours d'activité et retourne max 3 insights via
structured output (tool_use forcé). Fallback: insights vides si la
clé API manque, si Claude erre, ou si aucun signal. Auth guard
obligatoire.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — `ReemInsights` + intégration dashboard

**Files:**
- Create: `components/reem/ReemInsights.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Créer le composant**

```typescript
// components/reem/ReemInsights.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Insight } from '@/lib/reem-types'
import { useReemUIPersistence } from '@/hooks/useReemUIPersistence'

const CACHE_KEY = 'reem.insights.cache'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface CachedInsights {
  insights: Insight[]
  fetchedAt: number
}

function loadCache(): CachedInsights | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedInsights
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function saveCache(insights: Insight[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ insights, fetchedAt: Date.now() }))
  } catch {
    // silencieux
  }
}

export default function ReemInsights() {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(false)
  const { setState } = useReemUIPersistence()

  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      setInsights(cached.insights)
      return
    }

    async function fetchInsights() {
      setLoading(true)
      try {
        const res = await fetch('/api/agent/insights')
        if (!res.ok) {
          setInsights([])
          return
        }
        const data = (await res.json()) as { insights: Insight[] }
        setInsights(data.insights ?? [])
        saveCache(data.insights ?? [])
      } catch {
        setInsights([])
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  const handleInsightClick = (insight: Insight) => {
    // Ouvre le widget avec un brouillon pré-rempli ; l'utilisateur clique Envoyer
    setState(prev => ({
      ...prev,
      visibility: 'panel-open',
      draftMessage: insight.actionPrompt,
    }))
  }

  if (!insights || insights.length === 0) return null

  const severityColor: Record<Insight['severity'], string> = {
    info: '#818cf8',
    warning: '#f59e0b',
    alert: '#f43f5e',
  }

  return (
    <section
      aria-label="Insights Reem AI"
      style={{
        marginTop: '40px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#3d4f63',
          fontWeight: 600,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8' }} />
        Reem observe
        {loading && <span style={{ color: '#8898aa', textTransform: 'none', letterSpacing: 0 }}>— analyse en cours…</span>}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {insights.map(insight => (
          <button
            key={insight.id}
            type="button"
            onClick={() => handleInsightClick(insight)}
            style={{
              textAlign: 'left',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${severityColor[insight.severity]}33`,
              borderLeft: `3px solid ${severityColor[insight.severity]}`,
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>{insight.icon}</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8edf5' }}>{insight.title}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#8898aa', lineHeight: 1.5, marginBottom: '8px' }}>
              {insight.description}
            </div>
            <div style={{ fontSize: '11px', color: severityColor[insight.severity], fontWeight: 500 }}>
              → {insight.actionLabel}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Intégrer au dashboard**

Lire `app/dashboard/page.tsx` :

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && cat app/dashboard/page.tsx`

Ajouter l'import :
```typescript
import ReemInsights from '@/components/reem/ReemInsights'
```

Et ajouter `<ReemInsights />` **en fin de la page**, après tous les contenus existants (graphiques, tableaux...). Il doit être le tout dernier enfant du conteneur principal.

- [ ] **Step 3: Lint + typecheck + tests**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit 2>&1 | grep -v "app/dashboard/agent" | tail -15 && npm test`

- [ ] **Step 4: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add components/reem/ReemInsights.tsx app/dashboard/page.tsx
git commit -m "feat(reem): ReemInsights sur dashboard avec cache localStorage 10min

Encart discret en bas de /dashboard, 3 cartes max, fetchées depuis
/api/agent/insights, cachées 10 minutes côté client. Clic sur une
carte ouvre le widget Reem avec le actionPrompt pré-rempli dans
l'input (l'utilisateur clique Envoyer lui-même).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13 — Suppression `/dashboard/agent` + nettoyage sidebar

**Files:**
- Delete: `app/dashboard/agent/page.tsx`
- Delete: `app/dashboard/agent/loading.tsx`
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Supprimer la page agent**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
rm -rf app/dashboard/agent
```

- [ ] **Step 2: Nettoyer la sidebar**

Lire :

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && grep -n "agent" components/layout/Sidebar.tsx`

Dans `components/layout/Sidebar.tsx` :
- Supprimer l'entrée `'/dashboard/agent': (...)` du dictionnaire `NAV_ICONS`
- Supprimer `{ label: 'Reem AI', href: '/dashboard/agent' }` de `NAV_ITEMS`
- Supprimer le bloc conditionnel qui affiche le badge "Online" sur l'entrée Reem AI (si présent)

- [ ] **Step 3: Vérifier qu'aucune autre référence ne subsiste**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && grep -rn "/dashboard/agent" --include="*.ts" --include="*.tsx" . | grep -v node_modules`
Expected: ZERO match

- [ ] **Step 4: Build complet**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit && npm run build && npm test`
Expected: tout vert, 41 tests passing (32 + 5 + 4)

- [ ] **Step 5: Commit**

```bash
cd /Users/hugueshenridelpit/commission-tracker/commission-tracker
git add components/layout/Sidebar.tsx
git rm -r app/dashboard/agent
git commit -m "chore(reem): suppression page /dashboard/agent + entrée sidebar

Reem est maintenant accessible uniquement via le widget flottant
monté dans le layout global. L'historique de conversation reste
dans le panneau via le bouton 📋.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 14 — Vérification finale + checklist manuelle

**Goal :** Audit final + tests fonctionnels manuels avant push.

- [ ] **Step 1: Sous-agent reviewer final**

Dispatcher un agent `general-purpose` (modèle sonnet) avec le prompt :

```
Audite la feature Reem AI V1 dans le projet
~/commission-tracker/commission-tracker. Commits concernés :
git log --oneline 9dde92b..HEAD (après le spec)

Vérifier :
1. Aucun import cassé vers /dashboard/agent ou confirmAction
2. ReemWidget est monté une seule fois dans app/dashboard/layout.tsx
3. Les 6 nouveaux tools de agent-tools.ts sont cohérents (query_data,
   get_overdue_payments, summarize_period, search_drive, draft_email,
   propose_navigation). Aucune référence à create_commission / create_paiement.
4. useReemUIPersistence est bien appelé partout (ReemWidget, ReemInsights)
   et la persistance fonctionne avec validation structurelle
5. Le prompt système de /api/agent/chat mentionne bien que V1 est
   read-only et n'autorise pas les créations DB directes
6. /api/agent/insights utilise structured output (tool_choice forcé)
7. ReemInsights cache 10 minutes via localStorage avec timestamp
8. AgentMessage.tsx rend bien le nouveau type 'navigation' en chip cliquable
9. Signature LR Consulting (/api/email/send) reste INTOUCHÉE
10. npm run lint && npx tsc --noEmit && npm run build && npm test passent

Rapporter en moins de 300 mots, sections Critical / Important / Minor / Verified.
```

- [ ] **Step 2: Démarrer le dev server**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && lsof -ti:3000 | xargs -r kill ; npm run dev`

(Si un dev server tourne déjà, utiliser son PID exact avec `kill <pid>`, jamais `pkill -f`.)

- [ ] **Step 3: Checklist manuelle (utilisateur valide chaque point)**

Ouvrir http://localhost:3000 et tester :

- [ ] La bulle Reem est visible en bas-droite sur toutes les pages (/dashboard, /clients, /workspace, /invoices, /chat)
- [ ] Clic bulle → panneau s'ouvre avec animation
- [ ] Header panneau affiche le bon contexte selon la page
- [ ] Les suggestions changent selon la page courante
- [ ] Clic ✕ → panneau se ferme, bulle revient
- [ ] Clic 👁 masquer → pull-tab apparaît à droite mi-hauteur
- [ ] Clic pull-tab → bulle revient
- [ ] Cmd+L (ou Ctrl+L) cycle : masqué → bulle → panneau → bulle
- [ ] Escape depuis panneau → bulle
- [ ] Clic-droit sur la bulle → masque complètement
- [ ] Brouillon d'input préservé après fermeture/réouverture du panneau
- [ ] Refresh navigateur : état de visibilité préservé
- [ ] Navigation entre pages : état préservé, contexte mis à jour
- [ ] Envoi d'un message « Résume-moi ce mois » → réponse avec chiffres
- [ ] `draft_email` via Reem : le chip cliquable pointe vers /dashboard/workspace?to=...
- [ ] Clic sur le chip → le tiroir Workspace s'ouvre pré-rempli
- [ ] `propose_navigation` via Reem : affiche un chip avec flèche, clic navigue
- [ ] `search_drive` via Reem : retourne la liste des fichiers
- [ ] Bouton 📋 historique : affiche les messages passés, bouton clear fonctionne
- [ ] Nouveau chat après clear : pas de bug, suggestions réapparaissent
- [ ] `/dashboard/agent` → 404
- [ ] Sidebar : plus d'entrée « Reem AI »
- [ ] `<ReemInsights />` visible en bas du dashboard après chargement (peut être vide si pas de signal)
- [ ] Si des insights sont présents : clic → panneau Reem s'ouvre avec le prompt pré-rempli dans l'input
- [ ] Deuxième chargement du dashboard (moins de 10min) : insights servis depuis le cache (vérifier DevTools Network = pas d'appel à /api/agent/insights)
- [ ] Widget Reem coexiste avec le tiroir email du Workspace (les deux ouverts simultanément sans conflit)
- [ ] Un email envoyé via le tiroir Workspace (déclenché par Reem) contient la signature LR Consulting dans la boîte de réception
- [ ] Design tokens respectés : backgrounds #07080d/#0f1117, accents #6366f1/#818cf8, rien qui dépareille

- [ ] **Step 4: Si tout passe, aucun commit supplémentaire**

Si un petit fix a été nécessaire pendant la vérif manuelle, le commiter avec un message `fix(reem): …`.

- [ ] **Step 5: Mettre à jour MEMORY projet**

Mettre à jour `~/.claude/projects/-Users-hugueshenridelpit/memory/project_commission_tracker.md` pour mentionner la nouvelle feature Reem AI V1 (widget + insights).

---

## Critères de succès (rappel du spec)

1. ✅ Widget 3 états fonctionnel sur toutes les pages du dashboard
2. ✅ Navigation + refresh préservent l'état et le brouillon
3. ✅ `⌘L` cycle correct, `Escape` ferme le panneau
4. ✅ Historique accessible via bouton 📋
5. ✅ Page `/dashboard/agent` supprimée, sidebar nettoyée
6. ✅ 6 tools V1 répondent correctement
7. ✅ `draft_email` ouvre le tiroir Workspace pré-rempli, signature préservée
8. ✅ `<ReemInsights />` génère 0-3 cartes LLM-powered, cachées 10min
9. ✅ `npm run lint && npx tsc --noEmit && npm run build && npm test` verts
10. ✅ Checklist manuelle Task 14 passée intégralement
11. ✅ Sous-agent reviewer final sans critique bloquante
