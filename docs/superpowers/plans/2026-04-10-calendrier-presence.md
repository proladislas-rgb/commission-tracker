# Calendrier de Présence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calendrier de présence intégré au dashboard, branché sur Google Sheets, avec compteurs temps réel et alertes seuil 183 jours France.

**Architecture:** API route Next.js lit/écrit le Google Sheet via REST API (pas de SDK). Un hook `usePresence` gère le state côté client. Le calendrier affiche un mois à la fois, chaque jour est cliquable (cycle 🇫🇷→🇧🇭→🌍→vide). Les compteurs annuels sont calculés côté client à partir des données chargées.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Google Sheets API v4 (REST), cookies httpOnly pour tokens Google.

**Spreadsheet ID:** `13SeeG6LgR6k2725VfxkjHpBiQlKbyVXclx_pz05g2-g`
**Onglets:** `2025`, `2026`, `2027`, `2028`
**Colonnes attendues:** A=Date, B=Jour, C=🇫🇷 France, D=🇧🇭 Bahreïn, E=🌍 Autres (+ compteurs auto dans les colonnes suivantes)

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `lib/sheets.ts` | Helper Google Sheets API — read range, update cell |
| `app/api/sheets/presence/route.ts` | API route GET (lire onglet année) + PUT (modifier une cellule jour) |
| `hooks/usePresence.ts` | Hook client — fetch, cache, toggle jour, compteurs calculés |
| `components/presence/CalendrierGrid.tsx` | Grille calendrier mensuelle avec jours cliquables |
| `components/presence/CompteurCards.tsx` | 3 cartes compteurs annuels (France/Bahreïn/Autres) |
| `components/presence/AlerteSeuil.tsx` | Bannière alerte conditionnelle (warning 170+, danger 183+) |
| `app/dashboard/calendrier-presence/page.tsx` | Page dashboard assemblant tous les composants |
| `app/dashboard/calendrier-presence/loading.tsx` | Skeleton loader |

### Modified files
| File | Change |
|------|--------|
| `lib/google.ts:13` | Changer `spreadsheets.readonly` → `spreadsheets` (besoin écriture) |
| `lib/types.ts` | Ajouter types `PresenceType`, `PresenceDay`, `PresenceYear` |
| `components/layout/Sidebar.tsx:14-52` | Ajouter nav item + icône calendrier |

---

## Task 1: Types de présence

**Files:**
- Modify: `lib/types.ts` (ajouter à la fin)

- [ ] **Step 1: Ajouter les types**

```typescript
// --- Calendrier de Présence ---

export type PresenceType = 'france' | 'bahrein' | 'autres' | null

export interface PresenceDay {
  date: string        // "2026-01-15"
  jour: string        // "Jeudi"
  presence: PresenceType
}

export interface PresenceYear {
  year: number
  days: PresenceDay[]
}
```

- [ ] **Step 2: Vérifier le build**

Run: `cd /Users/hugueshenridelpit/commission-tracker/commission-tracker && npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(presence): add PresenceType, PresenceDay, PresenceYear types"
```

---

## Task 2: Changer le scope OAuth en lecture/écriture

**Files:**
- Modify: `lib/google.ts:13`

- [ ] **Step 1: Remplacer le scope**

Dans `lib/google.ts`, remplacer :
```typescript
'https://www.googleapis.com/auth/spreadsheets.readonly',
```
par :
```typescript
'https://www.googleapis.com/auth/spreadsheets',
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add lib/google.ts
git commit -m "feat(presence): upgrade sheets scope to read/write for presence toggle"
```

---

## Task 3: Helper Google Sheets API

**Files:**
- Create: `lib/sheets.ts`

- [ ] **Step 1: Créer le helper**

```typescript
import type { StoredTokens } from '@/lib/google'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SPREADSHEET_ID = '13SeeG6LgR6k2725VfxkjHpBiQlKbyVXclx_pz05g2-g'

export interface SheetRow {
  date: string
  jour: string
  france: string
  bahrein: string
  autres: string
}

/**
 * Lit une plage du spreadsheet.
 * range format: "2026!A:E"
 */
export async function readSheetRange(
  accessToken: string,
  range: string
): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Sheets API read error: ${error}`)
  }

  const data = (await res.json()) as { values?: string[][] }
  return data.values ?? []
}

/**
 * Écrit une valeur dans une cellule.
 * range format: "2026!C15" (colonne C, ligne 15)
 */
export async function writeSheetCell(
  accessToken: string,
  range: string,
  value: string
): Promise<void> {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Sheets API write error: ${error}`)
  }
}

/**
 * Parse les lignes brutes du sheet en objets structurés.
 * Ignore la première ligne (header).
 * Convention : cellule non vide = présent, vide = absent.
 */
export function parseSheetRows(rows: string[][]): SheetRow[] {
  // Skip header row
  return rows.slice(1).map(row => ({
    date: row[0] ?? '',
    jour: row[1] ?? '',
    france: row[2] ?? '',
    bahrein: row[3] ?? '',
    autres: row[4] ?? '',
  })).filter(r => r.date !== '')
}

/**
 * Détermine la colonne Sheets (C, D, E) pour un type de présence.
 */
export function presenceTypeToColumn(type: 'france' | 'bahrein' | 'autres'): string {
  switch (type) {
    case 'france': return 'C'
    case 'bahrein': return 'D'
    case 'autres': return 'E'
  }
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add lib/sheets.ts
git commit -m "feat(presence): add Google Sheets API helper (read/write/parse)"
```

---

## Task 4: API route GET + PUT

**Files:**
- Create: `app/api/sheets/presence/route.ts`

- [ ] **Step 1: Créer la route API**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken, type StoredTokens } from '@/lib/google'
import {
  readSheetRange,
  writeSheetCell,
  parseSheetRows,
  presenceTypeToColumn,
} from '@/lib/sheets'
import type { PresenceDay, PresenceType } from '@/lib/types'

/** Résout les tokens Google depuis les cookies, refresh si expiré. */
async function resolveTokens(
  request: NextRequest
): Promise<{ tokens: StoredTokens; wasRefreshed: boolean } | NextResponse> {
  const raw = request.cookies.get('google_tokens')?.value
  if (!raw) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(raw) as StoredTokens
  } catch {
    return NextResponse.json({ error: 'invalid_tokens' }, { status: 401 })
  }

  let wasRefreshed = false
  if (Date.now() > tokens.expires_at) {
    if (!tokens.refresh_token) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    try {
      const refreshed = await refreshGoogleToken(tokens.refresh_token)
      tokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
      }
      wasRefreshed = true
    } catch {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 401 })
    }
  }
  return { tokens, wasRefreshed }
}

function setCookieIfRefreshed(
  response: NextResponse,
  tokens: StoredTokens,
  wasRefreshed: boolean
): NextResponse {
  if (wasRefreshed) {
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return response
}

function sheetRowToPresenceType(row: { france: string; bahrein: string; autres: string }): PresenceType {
  if (row.france.trim()) return 'france'
  if (row.bahrein.trim()) return 'bahrein'
  if (row.autres.trim()) return 'autres'
  return null
}

/**
 * GET /api/sheets/presence?year=2026
 * Retourne toutes les présences de l'année.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const year = request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear())
  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
  }

  const result = await resolveTokens(request)
  if (result instanceof NextResponse) return result
  const { tokens, wasRefreshed } = result

  try {
    const rows = await readSheetRange(tokens.access_token, `${year}!A:E`)
    const parsed = parseSheetRows(rows)

    const days: PresenceDay[] = parsed.map(row => ({
      date: row.date,
      jour: row.jour,
      presence: sheetRowToPresenceType(row),
    }))

    const response = NextResponse.json({ year: Number(year), days })
    return setCookieIfRefreshed(response, tokens, wasRefreshed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Sheets API'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

/**
 * PUT /api/sheets/presence
 * Body: { year: 2026, rowIndex: 15, presence: "france" | "bahrein" | "autres" | null }
 * rowIndex = index 0-based dans le tableau (hors header), donc row Sheets = rowIndex + 2
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  let body: { year: number; rowIndex: number; presence: PresenceType }
  try {
    body = (await request.json()) as { year: number; rowIndex: number; presence: PresenceType }
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const { year, rowIndex, presence } = body
  if (!year || rowIndex == null || rowIndex < 0) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const result = await resolveTokens(request)
  if (result instanceof NextResponse) return result
  const { tokens, wasRefreshed } = result

  // Row in sheet = rowIndex + 2 (1-indexed + skip header)
  const sheetRow = rowIndex + 2

  try {
    // Clear all 3 columns first
    await Promise.all([
      writeSheetCell(tokens.access_token, `${year}!C${sheetRow}`, ''),
      writeSheetCell(tokens.access_token, `${year}!D${sheetRow}`, ''),
      writeSheetCell(tokens.access_token, `${year}!E${sheetRow}`, ''),
    ])

    // Set the selected column if not null
    if (presence) {
      const col = presenceTypeToColumn(presence)
      await writeSheetCell(tokens.access_token, `${year}!${col}${sheetRow}`, 'X')
    }

    const response = NextResponse.json({ ok: true })
    return setCookieIfRefreshed(response, tokens, wasRefreshed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Sheets API'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK, route `/api/sheets/presence` apparaît dans la liste

- [ ] **Step 3: Commit**

```bash
git add app/api/sheets/presence/route.ts
git commit -m "feat(presence): add API route GET/PUT for sheets presence data"
```

---

## Task 5: Hook usePresence

**Files:**
- Create: `hooks/usePresence.ts`

- [ ] **Step 1: Créer le hook**

```typescript
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { PresenceDay, PresenceType, PresenceYear } from '@/lib/types'

const CURRENT_YEAR = new Date().getFullYear()

export function usePresence(initialYear?: number) {
  const [year, setYear] = useState(initialYear ?? CURRENT_YEAR)
  const [days, setDays] = useState<PresenceDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (y: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sheets/presence?year=${y}`)
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        throw new Error(data.error)
      }
      const data = (await res.json()) as PresenceYear
      setDays(data.days)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(year)
  }, [year, load])

  const changeYear = useCallback((y: number) => {
    setYear(y)
  }, [])

  /** Toggle la présence d'un jour : france → bahrein → autres → null → france */
  const toggleDay = useCallback(async (dayIndex: number) => {
    const day = days[dayIndex]
    if (!day) return

    const cycle: PresenceType[] = ['france', 'bahrein', 'autres', null]
    const currentIdx = cycle.indexOf(day.presence)
    const next = cycle[(currentIdx + 1) % cycle.length]

    // Optimistic update
    setDays(prev =>
      prev.map((d, i) => (i === dayIndex ? { ...d, presence: next } : d))
    )

    try {
      const res = await fetch('/api/sheets/presence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, rowIndex: dayIndex, presence: next }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        throw new Error(data.error)
      }
    } catch (e) {
      // Rollback
      setDays(prev =>
        prev.map((d, i) => (i === dayIndex ? { ...d, presence: day.presence } : d))
      )
      setError(e instanceof Error ? e.message : 'Erreur de mise à jour')
    }
  }, [days, year])

  /** Compteurs annuels */
  const counters = useMemo(() => {
    let france = 0
    let bahrein = 0
    let autres = 0
    for (const d of days) {
      if (d.presence === 'france') france++
      else if (d.presence === 'bahrein') bahrein++
      else if (d.presence === 'autres') autres++
    }
    return { france, bahrein, autres }
  }, [days])

  return { year, days, loading, error, counters, changeYear, toggleDay, reload: () => load(year) }
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add hooks/usePresence.ts
git commit -m "feat(presence): add usePresence hook with optimistic toggle and counters"
```

---

## Task 6: Composant CalendrierGrid

**Files:**
- Create: `components/presence/CalendrierGrid.tsx`

- [ ] **Step 1: Créer le composant calendrier**

```typescript
'use client'

import type { PresenceDay, PresenceType } from '@/lib/types'

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const PRESENCE_STYLES: Record<string, { bg: string; border: string; text: string; flag: string }> = {
  france:  { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', text: '#818cf8', flag: '🇫🇷' },
  bahrein: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', flag: '🇧🇭' },
  autres:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10b981', flag: '🌍' },
}

interface CalendrierGridProps {
  year: number
  month: number // 0-indexed
  days: PresenceDay[]
  onToggle: (dayIndex: number) => void
  onChangeMonth: (month: number) => void
  onChangeYear: (year: number) => void
}

function parseDateStr(dateStr: string): Date | null {
  // Handle formats: "15/01/2026", "2026-01-15", "15 janvier 2026"
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr)
  // Try DD/MM/YYYY
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
  // Fallback
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export default function CalendrierGrid({ year, month, days, onToggle, onChangeMonth, onChangeYear }: CalendrierGridProps) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // First day of month (0=Sunday, convert to Monday-based)
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // 0=Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build index: date string → { dayIndex, presence }
  const dayMap = new Map<string, { index: number; presence: PresenceType }>()
  days.forEach((d, i) => {
    const parsed = parseDateStr(d.date)
    if (parsed) {
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
      dayMap.set(key, { index: i, presence: d.presence })
    }
  })

  const handlePrevMonth = () => {
    if (month === 0) {
      onChangeYear(year - 1)
      onChangeMonth(11)
    } else {
      onChangeMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      onChangeYear(year + 1)
      onChangeMonth(0)
    } else {
      onChangeMonth(month + 1)
    }
  }

  const cells: React.ReactNode[] = []

  // Empty cells before first day
  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const entry = dayMap.get(dateKey)
    const presence = entry?.presence ?? null
    const style = presence ? PRESENCE_STYLES[presence] : null
    const isToday = dateKey === todayStr

    cells.push(
      <button
        key={d}
        onClick={() => entry != null ? onToggle(entry.index) : undefined}
        className="aspect-square flex flex-col items-center justify-center rounded-[10px] transition-all duration-150 cursor-pointer border"
        style={{
          backgroundColor: style?.bg ?? '#151a24',
          borderColor: isToday ? '#6366f1' : (style?.border ?? 'transparent'),
          color: style?.text ?? '#8898aa',
          boxShadow: isToday ? '0 0 0 2px #6366f1' : undefined,
          gap: '2px',
        }}
        title={presence ? PRESENCE_STYLES[presence].flag : 'Non renseigné'}
      >
        <span className="text-sm font-medium">{d}</span>
        {style && <span className="text-[11px] leading-none">{style.flag}</span>}
      </button>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-card p-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {/* Navigation mois + année */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-btn bg-raised border border-border2 text-txt flex items-center justify-center hover:border-indigo transition-colors cursor-pointer"
          >
            ◀
          </button>
          <span className="text-lg font-semibold text-txt min-w-[160px] text-center">
            {MOIS_LABELS[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-btn bg-raised border border-border2 text-txt flex items-center justify-center hover:border-indigo transition-colors cursor-pointer"
          >
            ▶
          </button>
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-btn p-[3px]">
          {[2025, 2026, 2027, 2028].map(y => (
            <button
              key={y}
              onClick={() => onChangeYear(y)}
              className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: y === year ? '#6366f1' : 'transparent',
                color: y === year ? '#ffffff' : '#8898aa',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-1.5">
        {JOURS_SEMAINE.map(j => (
          <div key={j} className="text-center text-xs font-semibold text-txt3 uppercase tracking-wider py-2">
            {j}
          </div>
        ))}
        {cells}
      </div>

      {/* Légende */}
      <div className="flex gap-5 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo" /> France
        </div>
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber" /> Bahreïn
        </div>
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald" /> Autres
        </div>
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-txt3" /> Non renseigné
        </div>
      </div>

      <p className="text-center text-xs text-txt3 mt-3">
        Cliquer sur un jour pour changer : 🇫🇷 → 🇧🇭 → 🌍 → vide
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add components/presence/CalendrierGrid.tsx
git commit -m "feat(presence): add CalendrierGrid component with month navigation and day toggle"
```

---

## Task 7: Composant CompteurCards

**Files:**
- Create: `components/presence/CompteurCards.tsx`

- [ ] **Step 1: Créer le composant**

```typescript
'use client'

interface CompteurCardsProps {
  france: number
  bahrein: number
  autres: number
}

const SEUIL = 183
const SEUIL_WARNING = 170

export default function CompteurCards({ france, bahrein, autres }: CompteurCardsProps) {
  const pct = Math.min((france / SEUIL) * 100, 100)
  const remaining = Math.max(SEUIL - france, 0)

  let barColor = '#10b981' // emerald = safe
  if (france >= SEUIL) barColor = '#f43f5e' // rose = danger
  else if (france >= SEUIL_WARNING) barColor = '#f59e0b' // amber = warning

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* France */}
      <div className="bg-surface border border-border rounded-card p-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-txt2 font-medium">France</span>
          <span className="text-xl">🇫🇷</span>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold" style={{ color: '#818cf8' }}>{france}</span>
          <span className="text-base font-normal text-txt3"> / {SEUIL}</span>
        </div>
        <div className="h-1.5 bg-raised rounded-full mt-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="text-xs text-txt3 mt-2">
          {france >= SEUIL
            ? 'Limite dépassée'
            : `${remaining} jour${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} avant le seuil`}
        </p>
      </div>

      {/* Bahreïn */}
      <div className="bg-surface border border-border rounded-card p-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-txt2 font-medium">Bahreïn</span>
          <span className="text-xl">🇧🇭</span>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{bahrein}</span>
        </div>
        <p className="text-xs text-txt3 mt-2">jours en {new Date().getFullYear()}</p>
      </div>

      {/* Autres */}
      <div className="bg-surface border border-border rounded-card p-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-txt2 font-medium">Autres</span>
          <span className="text-xl">🌍</span>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold" style={{ color: '#10b981' }}>{autres}</span>
        </div>
        <p className="text-xs text-txt3 mt-2">jours en {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add components/presence/CompteurCards.tsx
git commit -m "feat(presence): add CompteurCards with progress bar and threshold colors"
```

---

## Task 8: Composant AlerteSeuil

**Files:**
- Create: `components/presence/AlerteSeuil.tsx`

- [ ] **Step 1: Créer le composant**

```typescript
'use client'

interface AlerteSeuilProps {
  franceDays: number
}

const SEUIL = 183
const SEUIL_WARNING = 170

export default function AlerteSeuil({ franceDays }: AlerteSeuilProps) {
  if (franceDays < SEUIL_WARNING) return null

  const isDanger = franceDays >= SEUIL

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-card text-sm font-medium"
      style={{
        backgroundColor: isDanger ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isDanger ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)',
        color: isDanger ? '#f43f5e' : '#f59e0b',
      }}
    >
      <span className="text-lg">{isDanger ? '🚨' : '⚠️'}</span>
      <span>
        {isDanger
          ? `Limite dépassée — ${franceDays} jours de présence fiscale en France (seuil : ${SEUIL})`
          : `Attention — vous approchez du seuil de ${SEUIL} jours en France (${franceDays} jours)`}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 3: Commit**

```bash
git add components/presence/AlerteSeuil.tsx
git commit -m "feat(presence): add AlerteSeuil component (warning 170+, danger 183+)"
```

---

## Task 9: Page dashboard + loading skeleton

**Files:**
- Create: `app/dashboard/calendrier-presence/page.tsx`
- Create: `app/dashboard/calendrier-presence/loading.tsx`

- [ ] **Step 1: Créer le skeleton loader**

```typescript
export default function CalendrierPresenceLoading() {
  return (
    <>
      <div className="mb-6">
        <div className="h-7 w-64 bg-raised rounded-btn skeleton mb-2" />
        <div className="h-4 w-48 bg-raised rounded-btn skeleton" />
      </div>
      <div className="bg-surface border border-border rounded-card p-6 mb-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="h-9 w-full bg-raised rounded-btn skeleton mb-6" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-raised rounded-[10px] skeleton" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-card p-5 h-32 skeleton" />
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Créer la page**

```typescript
'use client'

import { useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import CalendrierGrid from '@/components/presence/CalendrierGrid'
import CompteurCards from '@/components/presence/CompteurCards'
import AlerteSeuil from '@/components/presence/AlerteSeuil'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default function CalendrierPresencePage() {
  const [month, setMonth] = useState(new Date().getMonth())
  const { year, days, loading, error, counters, changeYear, toggleDay, reload } = usePresence()

  const handleChangeYear = (y: number) => {
    changeYear(y)
    // Keep current month, unless it would be out of range
    setMonth(prev => prev)
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt">Calendrier de Présence</h1>
        <p className="text-sm text-txt2 mt-1">Suivi fiscal — règle des 183 jours</p>
      </div>

      {/* Error */}
      {error && <div className="mb-4"><ErrorAlert message={error} onRetry={reload} /></div>}

      {/* Calendar */}
      {loading ? (
        <div className="bg-surface border border-border rounded-card p-6 mb-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square bg-raised rounded-[10px] skeleton" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <CalendrierGrid
            year={year}
            month={month}
            days={days}
            onToggle={toggleDay}
            onChangeMonth={setMonth}
            onChangeYear={handleChangeYear}
          />
        </div>
      )}

      {/* Counters */}
      {!loading && (
        <div className="mb-6">
          <CompteurCards
            france={counters.france}
            bahrein={counters.bahrein}
            autres={counters.autres}
          />
        </div>
      )}

      {/* Alert */}
      {!loading && <AlerteSeuil franceDays={counters.france} />}
    </>
  )
}
```

- [ ] **Step 3: Vérifier le build**

Run: `npm run build`
Expected: Build OK, `/dashboard/calendrier-presence` apparaît dans les routes

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/calendrier-presence/
git commit -m "feat(presence): add calendrier-presence page with skeleton loader"
```

---

## Task 10: Ajouter le nav item dans la sidebar

**Files:**
- Modify: `components/layout/Sidebar.tsx:14-52`

- [ ] **Step 1: Ajouter l'icône calendrier dans NAV_ICONS**

Après l'entrée `'/dashboard/workspace'` et avant `'/dashboard/chat'`, ajouter :

```typescript
'/dashboard/calendrier-presence': (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
),
```

- [ ] **Step 2: Ajouter le nav item dans NAV_ITEMS**

Après `{ label: 'Workspace', href: '/dashboard/workspace' }` et avant `{ label: 'Chat', ... }`, ajouter :

```typescript
{ label: 'Présence',    href: '/dashboard/calendrier-presence' },
```

- [ ] **Step 3: Vérifier le build**

Run: `npm run build`
Expected: Build OK

- [ ] **Step 4: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(presence): add Présence nav item to sidebar"
```

---

## Task 11: Test manuel end-to-end

- [ ] **Step 1: Lancer le dev server**

Run: `npm run dev`

- [ ] **Step 2: Se reconnecter à Google**

Naviguer vers le dashboard → la sidebar doit afficher "Présence" entre Workspace et Chat. Aller dans Workspace, se déconnecter de Google, se reconnecter (pour obtenir le nouveau scope `spreadsheets`).

- [ ] **Step 3: Tester le calendrier**

Naviguer vers `/dashboard/calendrier-presence` :
- Le calendrier doit afficher le mois en cours
- Les flèches doivent changer de mois
- Les onglets année doivent changer d'année et recharger les données
- Les compteurs doivent afficher les totaux annuels

- [ ] **Step 4: Tester le toggle**

Cliquer sur un jour :
- Le jour doit cycler : 🇫🇷 → 🇧🇭 → 🌍 → vide
- Le compteur doit se mettre à jour instantanément
- Vérifier dans le Google Sheet que la cellule a bien changé

- [ ] **Step 5: Commit final**

```bash
git commit --allow-empty -m "feat(presence): calendrier de présence feature complete"
```

---

## Task 12: Cleanup

- [ ] **Step 1: Supprimer le fichier design HTML**

```bash
rm design-calendrier.html
```

- [ ] **Step 2: Mettre à jour tasks/todo.md**

Marquer toutes les étapes du calendrier comme terminées.

- [ ] **Step 3: Build + lint + tests finaux**

Run: `npm run lint && npm test && npm run build`
Expected: tout passe

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: cleanup design mockup, update todo"
```
