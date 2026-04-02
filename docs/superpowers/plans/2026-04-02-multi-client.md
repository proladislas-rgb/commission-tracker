# Multi-Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin and associate to manage multiple clients, each with isolated primes, commissions, paiements, sommes dues, and invoices.

**Architecture:** React Context (`ClientProvider`) wraps the dashboard layout. All data hooks accept a `clientId` parameter and filter Supabase queries by `client_id`. A dropdown in the sidebar allows switching clients. A dedicated `/dashboard/clients` page manages client CRUD and pinning.

**Tech Stack:** Next.js 16, TypeScript, Supabase, React Context, localStorage

**Spec:** `docs/superpowers/specs/2026-04-02-multi-client-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `hooks/useClients.ts` | CRUD + realtime for `clients` table |
| `hooks/useClientContext.tsx` | Context provider + `useClientContext()` hook |
| `components/clients/ClientSelector.tsx` | Dropdown in sidebar to switch clients |
| `components/clients/ClientCard.tsx` | Card component for clients page |
| `app/dashboard/clients/page.tsx` | Client management page |

### Modified files
| File | Change |
|------|--------|
| `lib/types.ts` | Add `Client` type, add `client_id` to existing types |
| `hooks/useCommissions.ts` | Add `clientId` param + filter |
| `hooks/usePaiements.ts` | Add `clientId` param + filter |
| `hooks/useSommesDues.ts` | Add `clientId` param + filter |
| `app/dashboard/layout.tsx` | Wrap with `ClientProvider` |
| `app/dashboard/page.tsx` | Pass `clientId` to hooks, filter primes |
| `components/layout/Sidebar.tsx` | Add `ClientSelector` + "Clients" nav item |
| `components/invoice/InvoiceChat.tsx` | Read client from context for invoice generation |

---

### Task 1: Supabase migration — add `pinned` column

**Files:**
- None (SQL only)

- [ ] **Step 1: Execute SQL in Supabase**

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT true;
```

- [ ] **Step 2: Verify**

Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'pinned';
```
Expected: 1 row with `boolean` type, default `true`

---

### Task 2: Add `Client` type and `client_id` to existing types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add Client type and client_id fields**

In `lib/types.ts`, add after the `SommeDue` interface:

```typescript
export interface Client {
  id: string
  name: string
  siren: string | null
  address: string | null
  email: string | null
  color: string
  pinned: boolean
  created_by: string
  created_at: string
}
```

Add `client_id: string | null` to `Commission`, `Paiement`, `SommeDue`, and `Prime` interfaces.

In `Commission` interface, add after `created_by: string`:
```typescript
  client_id: string | null
```

In `Paiement` interface, add after `created_by: string`:
```typescript
  client_id: string | null
```

In `SommeDue` interface, add after `created_by: string`:
```typescript
  client_id: string | null
```

In `Prime` interface, add after `active: boolean`:
```typescript
  client_id: string | null
```

- [ ] **Step 2: Build check**

Run: `npx tsc --noEmit 2>&1`
Expected: Type errors in files that construct these types without `client_id`. Note them — they'll be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Client type and client_id to existing types"
```

---

### Task 3: Create `useClients` hook

**Files:**
- Create: `hooks/useClients.ts`

- [ ] **Step 1: Create the hook**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { Client } from '@/lib/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      if (err) throw err
      setClients((data ?? []) as Client[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime({
    table: 'clients',
    onInsert: row => {
      const c = row as unknown as Client
      setClients(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))
    },
    onUpdate: row => {
      const c = row as unknown as Client
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x))
    },
    onDelete: row => setClients(prev => prev.filter(x => x.id !== (row as unknown as { id: string }).id)),
  })

  const add = useCallback(async (data: { name: string; siren?: string; address?: string; email?: string; color?: string; created_by: string }) => {
    const { data: inserted, error: err } = await supabase
      .from('clients')
      .insert({ ...data, color: data.color ?? '#6366f1', pinned: true })
      .select('*')
      .single()
    if (err) throw err
    const client = inserted as Client
    setClients(prev => prev.some(x => x.id === client.id) ? prev : [...prev, client].sort((a, b) => a.name.localeCompare(b.name)))
    return client
  }, [])

  const update = useCallback(async (id: string, data: Partial<Pick<Client, 'name' | 'siren' | 'address' | 'email' | 'color'>>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    try {
      const { error: err } = await supabase.from('clients').update(data).eq('id', id)
      if (err) throw err
    } catch (e) {
      load()
      throw e
    }
  }, [load])

  const togglePin = useCallback(async (id: string) => {
    const client = clients.find(c => c.id === id)
    if (!client) return
    const newPinned = !client.pinned
    setClients(prev => prev.map(c => c.id === id ? { ...c, pinned: newPinned } : c))
    try {
      const { error: err } = await supabase.from('clients').update({ pinned: newPinned }).eq('id', id)
      if (err) throw err
    } catch (e) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, pinned: !newPinned } : c))
      throw e
    }
  }, [clients])

  const remove = useCallback(async (id: string) => {
    const snapshot = clients
    setClients(prev => prev.filter(c => c.id !== id))
    try {
      const { error: err } = await supabase.from('clients').delete().eq('id', id)
      if (err) throw err
    } catch (e) {
      setClients(snapshot)
      throw e
    }
  }, [clients])

  return { clients, loading, error, reload: load, add, update, togglePin, remove }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useClients.ts
git commit -m "feat: add useClients hook with CRUD and realtime"
```

---

### Task 4: Create `ClientProvider` context

**Files:**
- Create: `hooks/useClientContext.tsx`

- [ ] **Step 1: Create the context provider**

```typescript
'use client'

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { useClients } from './useClients'
import type { Client } from '@/lib/types'

interface ClientContextValue {
  clients: Client[]
  pinnedClients: Client[]
  selectedClientId: string | null
  selectedClient: Client | null
  setSelectedClientId: (id: string | null) => void
  clientsLoading: boolean
  addClient: ReturnType<typeof useClients>['add']
  updateClient: ReturnType<typeof useClients>['update']
  togglePinClient: ReturnType<typeof useClients>['togglePin']
  removeClient: ReturnType<typeof useClients>['remove']
  reloadClients: ReturnType<typeof useClients>['reload']
}

const ClientContext = createContext<ClientContextValue | null>(null)

const LS_KEY = 'ct_selected_client'

export function ClientProvider({ children }: { children: ReactNode }) {
  const { clients, loading, add, update, togglePin, remove, reload } = useClients()
  const [selectedClientId, setSelectedClientIdRaw] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) setSelectedClientIdRaw(stored)
    setInitialized(true)
  }, [])

  // Auto-select first pinned client if nothing selected
  useEffect(() => {
    if (!initialized || loading) return
    if (selectedClientId && clients.some(c => c.id === selectedClientId)) return
    const firstPinned = clients.find(c => c.pinned)
    const fallback = firstPinned?.id ?? clients[0]?.id ?? null
    if (fallback) {
      setSelectedClientIdRaw(fallback)
      localStorage.setItem(LS_KEY, fallback)
    } else {
      setSelectedClientIdRaw(null)
      localStorage.removeItem(LS_KEY)
    }
  }, [initialized, loading, clients, selectedClientId])

  function setSelectedClientId(id: string | null) {
    setSelectedClientIdRaw(id)
    if (id) localStorage.setItem(LS_KEY, id)
    else localStorage.removeItem(LS_KEY)
  }

  const pinnedClients = useMemo(() => clients.filter(c => c.pinned), [clients])
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId) ?? null, [clients, selectedClientId])

  const value: ClientContextValue = {
    clients,
    pinnedClients,
    selectedClientId,
    selectedClient,
    setSelectedClientId,
    clientsLoading: loading,
    addClient: add,
    updateClient: update,
    togglePinClient: togglePin,
    removeClient: remove,
    reloadClients: reload,
  }

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

export function useClientContext() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClientContext must be used within ClientProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useClientContext.tsx
git commit -m "feat: add ClientProvider context with localStorage persistence"
```

---

### Task 5: Wrap dashboard layout with `ClientProvider`

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Add ClientProvider import and wrapper**

Add import at top:
```typescript
import { ClientProvider } from '@/hooks/useClientContext'
```

Wrap the return in `ClientProvider`. Change:
```typescript
  return (
    <AppShell associe={associe} onRenameAssociate={handleRenameAssociate}>
      {children}
    </AppShell>
  )
```
To:
```typescript
  return (
    <ClientProvider>
      <AppShell associe={associe} onRenameAssociate={handleRenameAssociate}>
        {children}
      </AppShell>
    </ClientProvider>
  )
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | tail -5`
Expected: Build passes

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: wrap dashboard layout with ClientProvider"
```

---

### Task 6: Update hooks to filter by `clientId`

**Files:**
- Modify: `hooks/useCommissions.ts`
- Modify: `hooks/usePaiements.ts`
- Modify: `hooks/useSommesDues.ts`

- [ ] **Step 1: Update useCommissions**

Change signature from:
```typescript
export function useCommissions(userId?: string) {
```
To:
```typescript
export function useCommissions(userId?: string, clientId?: string) {
```

In `load`, after the `if (userId)` line, add:
```typescript
      if (clientId) query = query.eq('client_id', clientId)
```

Change dependency array from `[userId]` to `[userId, clientId]`.

- [ ] **Step 2: Update usePaiements**

Change signature from:
```typescript
export function usePaiements(createdBy?: string) {
```
To:
```typescript
export function usePaiements(createdBy?: string, clientId?: string) {
```

In `load`, after the `if (createdBy)` line, add:
```typescript
      if (clientId) query = query.eq('client_id', clientId)
```

Change dependency array from `[createdBy]` to `[createdBy, clientId]`.

- [ ] **Step 3: Update useSommesDues**

Change signature from:
```typescript
export function useSommesDues(createdBy?: string) {
```
To:
```typescript
export function useSommesDues(clientId?: string) {
```

Remove the unused `createdBy` parameter. In `load`, add after `.order(...)`:
```typescript
      if (clientId) query = query.eq('client_id', clientId)
```

Change dependency array to `[clientId]`.

- [ ] **Step 4: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: May have type errors from page.tsx — that's fine, fixed in Task 7.

- [ ] **Step 5: Commit**

```bash
git add hooks/useCommissions.ts hooks/usePaiements.ts hooks/useSommesDues.ts
git commit -m "feat: add clientId filter to all data hooks"
```

---

### Task 7: Update dashboard page to use client context

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Import client context**

Add import:
```typescript
import { useClientContext } from '@/hooks/useClientContext'
```

- [ ] **Step 2: Use context in component**

Inside `DashboardPage`, after `const { user } = useAuth()`, add:
```typescript
  const { selectedClientId, selectedClient } = useClientContext()
```

- [ ] **Step 3: Pass clientId to hooks**

Change:
```typescript
  const { commissions, ... } = useCommissions(associeId)
  const { paiements, ... } = usePaiements(associeId)
  const { sommesDues, ... } = useSommesDues(associeId)
```
To:
```typescript
  const { commissions, ... } = useCommissions(associeId, selectedClientId ?? undefined)
  const { paiements, ... } = usePaiements(associeId, selectedClientId ?? undefined)
  const { sommesDues, ... } = useSommesDues(selectedClientId ?? undefined)
```

- [ ] **Step 4: Filter primes by clientId**

In `loadPrimes`, change:
```typescript
      const { data, error } = await supabase.from('primes').select('*')
```
To:
```typescript
      let query = supabase.from('primes').select('*')
      if (selectedClientId) query = query.eq('client_id', selectedClientId)
      const { data, error } = await query
```

Add `selectedClientId` to the dependency array of `loadPrimes`:
```typescript
  }, [selectedClientId])
```

- [ ] **Step 5: Inject client_id in create functions**

In `handleAddCommission`, add `client_id: selectedClientId` to the data passed to `addCommission`.

In `handleCreatePrime`, add `client_id: selectedClientId` to the insert:
```typescript
      .insert({ id, name: data.name, color: data.color, icon: data.icon, active: true, client_id: selectedClientId })
```

Same for `handleCreatePrimeWithCommission`.

In `handleAddPaiement`, add `client_id: selectedClientId` to the data:
```typescript
  const handleAddPaiement = useCallback(async (data: Omit<Paiement, 'id' | 'created_at'>) => {
    await addPaiement({ ...data, client_id: selectedClientId })
```

- [ ] **Step 6: Add guard for no client selected**

Before the main return, after `if (!user) return null`, add:
```typescript
  if (!selectedClient) {
    return (
      <>
        <Header associe={associe} primesCount={0} onRenameAssociate={handleRenameAssociate} onMobileMenuOpen={() => {}} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-txt2 text-lg mb-2">Aucun client sélectionné</p>
          <p className="text-txt3 text-sm">Sélectionnez un client dans la sidebar ou créez-en un depuis la page Clients.</p>
        </div>
      </>
    )
  }
```

- [ ] **Step 7: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: Build passes

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard filters all data by selected client"
```

---

### Task 8: Create `ClientSelector` component for sidebar

**Files:**
- Create: `components/clients/ClientSelector.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientContext } from '@/hooks/useClientContext'

export default function ClientSelector({ collapsed }: { collapsed: boolean }) {
  const { pinnedClients, selectedClient, setSelectedClientId } = useClientContext()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (collapsed) {
    return selectedClient ? (
      <div
        className="w-6 h-6 rounded-full mx-auto cursor-pointer"
        style={{ backgroundColor: selectedClient.color }}
        title={selectedClient.name}
        onClick={() => setOpen(!open)}
      />
    ) : null
  }

  return (
    <div ref={ref} className="relative mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center gap-2 text-[11px] text-txt3 hover:text-txt2 transition-colors cursor-pointer"
      >
        Client :
        {selectedClient ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: selectedClient.color }} />
            <span className="text-txt2 font-medium">{selectedClient.name}</span>
          </span>
        ) : (
          <span className="text-txt3 italic">Sélectionner...</span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg z-50"
          style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          {pinnedClients.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedClientId(c.id); setOpen(false) }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors hover:bg-[rgba(139,92,246,0.08)] cursor-pointer"
              style={{ color: selectedClient?.id === c.id ? '#e8edf5' : '#8898aa' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
          <button
            onClick={() => { router.push('/dashboard/clients'); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-indigo hover:bg-[rgba(139,92,246,0.08)] transition-colors border-t border-[rgba(139,92,246,0.1)] cursor-pointer"
          >
            Tous les clients...
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/clients/ClientSelector.tsx
git commit -m "feat: add ClientSelector dropdown component"
```

---

### Task 9: Update Sidebar — add ClientSelector + nav item

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Add import**

```typescript
import ClientSelector from '@/components/clients/ClientSelector'
```

- [ ] **Step 2: Replace hardcoded client text**

Replace lines 169-173:
```typescript
        {!collapsed && (
          <>
            <div className="text-[11px] text-txt3 mt-1">
              Client : <span className="text-txt2 font-medium">ECODISTRIB</span>
            </div>
```
With:
```typescript
        {!collapsed && (
          <>
            <ClientSelector collapsed={false} />
```

Keep the date div that follows unchanged.

- [ ] **Step 3: Add "Clients" nav item**

In `NAV_ICONS`, add after the `/dashboard` entry:
```typescript
  '/dashboard/clients': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
```

In `NAV_ITEMS`, add after `Dashboard`:
```typescript
  { label: 'Clients',      href: '/dashboard/clients' },
```

- [ ] **Step 4: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: Build passes (clients page doesn't exist yet but Next.js handles missing pages gracefully)

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add ClientSelector to sidebar and Clients nav item"
```

---

### Task 10: Create `ClientCard` component

**Files:**
- Create: `components/clients/ClientCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { Client } from '@/lib/types'

interface Props {
  client: Client
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (client: Client) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

export default function ClientCard({ client, isSelected, onSelect, onEdit, onTogglePin, onDelete }: Props) {
  return (
    <div
      className="rounded-[20px] p-5 relative overflow-hidden transition-all duration-300 cursor-pointer group"
      style={{
        backgroundColor: '#0e0d1a',
        border: isSelected ? `2px solid ${client.color}` : '1px solid rgba(139,92,246,0.12)',
      }}
      onClick={() => onSelect(client.id)}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${client.color}, ${client.color}88)` }} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: client.color }} />
            <h3 className="text-txt font-bold text-sm">{client.name}</h3>
          </div>
          {client.siren && <p className="text-txt3 text-[11px]">SIREN: {client.siren}</p>}
          {client.address && <p className="text-txt3 text-[11px] mt-0.5">{client.address}</p>}
          {client.email && <p className="text-txt3 text-[11px] mt-0.5">{client.email}</p>}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(client.id) }}
            className="p-1.5 rounded-md text-txt3 hover:text-amber hover:bg-amber/10 transition-colors cursor-pointer"
            title={client.pinned ? 'Désépingler' : 'Épingler'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={client.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(client) }}
            className="p-1.5 rounded-md text-txt3 hover:text-indigo hover:bg-indigo/10 transition-colors cursor-pointer"
            title="Modifier"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (window.confirm(`Supprimer ${client.name} et toutes ses données ?`)) onDelete(client.id) }}
            className="p-1.5 rounded-md text-txt3 hover:text-rose hover:bg-rose/10 transition-colors cursor-pointer"
            title="Supprimer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/clients/ClientCard.tsx
git commit -m "feat: add ClientCard component"
```

---

### Task 11: Create clients page

**Files:**
- Create: `app/dashboard/clients/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useClientContext } from '@/hooks/useClientContext'
import ClientCard from '@/components/clients/ClientCard'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import type { Client } from '@/lib/types'

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#38bdf8', '#8b5cf6', '#ec4899', '#14b8a6']

export default function ClientsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { clients, pinnedClients, selectedClientId, setSelectedClientId, addClient, updateClient, togglePinClient, removeClient } = useClientContext()
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', siren: '', address: '', email: '', color: '#6366f1' })
  const [othersOpen, setOthersOpen] = useState(false)

  const unpinnedClients = clients.filter(c => !c.pinned)

  function openCreate() {
    setEditClient(null)
    setForm({ name: '', siren: '', address: '', email: '', color: DEFAULT_COLORS[clients.length % DEFAULT_COLORS.length] })
    setShowModal(true)
  }

  function openEdit(client: Client) {
    setEditClient(client)
    setForm({ name: client.name, siren: client.siren ?? '', address: client.address ?? '', email: client.email ?? '', color: client.color })
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      if (editClient) {
        await updateClient(editClient.id, {
          name: form.name.trim(),
          siren: form.siren || null,
          address: form.address || null,
          email: form.email || null,
          color: form.color,
        })
      } else {
        const created = await addClient({
          name: form.name.trim(),
          siren: form.siren || undefined,
          address: form.address || undefined,
          email: form.email || undefined,
          color: form.color,
          created_by: user!.id,
        })
        setSelectedClientId(created.id)
      }
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(id: string) {
    setSelectedClientId(id)
    router.push('/dashboard')
  }

  async function handleDelete(id: string) {
    await removeClient(id)
    if (selectedClientId === id) {
      const remaining = clients.filter(c => c.id !== id && c.pinned)
      setSelectedClientId(remaining[0]?.id ?? clients.find(c => c.id !== id)?.id ?? null)
    }
  }

  if (!user) return null

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-txt" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Mes clients</h1>
          <p className="text-sm text-txt2 mt-1">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Nouveau client</Button>
      </div>

      {clients.length === 0 && (
        <div className="rounded-card p-12 text-center" style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.12)' }}>
          <p className="text-txt2 text-lg mb-2">Aucun client</p>
          <p className="text-txt3 text-sm mb-4">Créez votre premier client pour commencer.</p>
          <Button onClick={openCreate}>+ Créer un client</Button>
        </div>
      )}

      {pinnedClients.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mb-4">Clients épinglés</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedClients.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                isSelected={c.id === selectedClientId}
                onSelect={handleSelect}
                onEdit={openEdit}
                onTogglePin={togglePinClient}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {unpinnedClients.length > 0 && (
        <section>
          <button
            onClick={() => setOthersOpen(!othersOpen)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.9px] text-txt3 font-semibold mb-4 hover:text-txt2 transition-colors cursor-pointer"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: othersOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Autres clients ({unpinnedClients.length})
          </button>
          {othersOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpinnedClients.map(c => (
                <ClientCard
                  key={c.id}
                  client={c}
                  isSelected={c.id === selectedClientId}
                  onSelect={handleSelect}
                  onEdit={openEdit}
                  onTogglePin={togglePinClient}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editClient ? `Modifier ${editClient.name}` : 'Nouveau client'}>
        <div className="flex flex-col gap-4">
          <Input label="Nom *" type="text" placeholder="ex : ECODISTRIB" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="SIREN" type="text" placeholder="ex : 903 879 492" value={form.siren} onChange={e => setForm(f => ({ ...f, siren: e.target.value }))} />
          <Input label="Adresse" type="text" placeholder="ex : 29 Rue Pradier, 92410 Ville-d'Avray" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Input label="Email" type="email" placeholder="ex : contact@client.eu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <div>
            <label className="block text-xs text-txt2 mb-1.5 font-medium">Couleur</label>
            <div className="flex gap-2">
              {DEFAULT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-7 h-7 rounded-full transition-transform cursor-pointer"
                  style={{
                    backgroundColor: c,
                    transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                    outline: form.color === c ? '2px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button loading={loading} onClick={handleSubmit}>{editClient ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: Build passes

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/clients/page.tsx
git commit -m "feat: add clients management page with pin/unpin"
```

---

### Task 12: Update InvoiceChat to use client context

**Files:**
- Modify: `components/invoice/InvoiceChat.tsx`

- [ ] **Step 1: Add client context import**

Add at top:
```typescript
import { useClientContext } from '@/hooks/useClientContext'
```

- [ ] **Step 2: Use selected client**

Inside the component, add:
```typescript
  const { selectedClient } = useClientContext()
```

Find where the chat sends messages to the API (the `sendMessage` call). The API route `/api/invoice/chat` needs to receive the client info. Modify the `sendMessage` call to include client context by appending to the user message:

In `handleSubmit`, change:
```typescript
    sendMessage(input)
```
To:
```typescript
    const clientInfo = selectedClient
      ? `\n[Client: ${selectedClient.name}${selectedClient.siren ? `, SIREN: ${selectedClient.siren}` : ''}${selectedClient.address ? `, Adresse: ${selectedClient.address}` : ''}]`
      : ''
    sendMessage(input + clientInfo)
```

- [ ] **Step 3: Build check**

Run: `npm run build 2>&1 | tail -10`
Expected: Build passes

- [ ] **Step 4: Commit**

```bash
git add components/invoice/InvoiceChat.tsx
git commit -m "feat: inject selected client info into invoice chat"
```

---

### Task 13: Final build verification and push

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build 2>&1`
Expected: 0 errors, all pages compile

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1`
Expected: 0 errors

- [ ] **Step 3: Verify no hardcoded ECODISTRIB remains**

Run: `grep -rn "ECODISTRIB" --include="*.tsx" --include="*.ts" app/ components/ hooks/ lib/`
Expected: Only in `lib/invoice-template.ts` (static template) and nowhere else in dashboard logic

- [ ] **Step 4: Push**

```bash
git push origin main
```
