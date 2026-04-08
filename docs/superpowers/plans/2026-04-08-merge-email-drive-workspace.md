# Workspace (fusion Drive + Email) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fusionner les onglets `/dashboard/drive` et `/dashboard/email` en une seule page `/dashboard/workspace` avec un tiroir email latéral, en éliminant les frictions de switch d'onglets et de brouillon perdu, sans aucune régression fonctionnelle.

**Architecture:** Page unique `WorkspacePage` qui héberge `DriveExplorer` (gauche) et un `EmailDrawer` rétractable (droite, 460px). L'état du brouillon vit dans la page parent via le hook `useDraftPersistence` (localStorage + debounce). Les composants `EmailComposer`, `DriveExplorer`, `DriveFileRow` sont modifiés à minima (props ajoutées + passage en mode contrôlé pour `EmailComposer`). Les routes API restent strictement inchangées. Les anciennes pages sont supprimées et remplacées par des redirections 308 dans `next.config.js` pour préserver tous les liens existants (Reem AI, OAuth, bookmarks).

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS · Vitest + @testing-library/react (jsdom)

**Spec :** `docs/superpowers/specs/2026-04-08-merge-email-drive-workspace-design.md`

---

## File Structure

### Files to create

| Path | Responsibility |
|---|---|
| `lib/workspace.ts` | Types `Draft` et `Attachment` partagés, constante `EMPTY_DRAFT`, helper `hasContent(draft)` |
| `hooks/useDraftPersistence.ts` | Hook qui gère l'état du brouillon + miroir localStorage avec debounce + restauration au montage + clear |
| `__tests__/hooks/useDraftPersistence.test.tsx` | Tests Vitest du hook (5 tests) |
| `components/workspace/WorkspaceHeader.tsx` | Header de la page Workspace : titre, sous-titre, bouton « Nouveau mail / Brouillon en cours » |
| `components/workspace/EmailDrawer.tsx` | Tiroir latéral animé (460px desktop), header avec ✕, contient un `EmailComposer` |
| `app/dashboard/workspace/page.tsx` | Page principale : check connexion Google, état brouillon, intégration de tous les composants, gestion query params Reem AI |
| `app/dashboard/workspace/loading.tsx` | Skeleton léger pendant le check de connexion |

### Files to modify

| Path | Modification |
|---|---|
| `components/email/EmailComposer.tsx` | Passage en mode **contrôlé** : nouvelles props `draft` + `onDraftChange` au lieu de `useState` interne. Suppression du header "Nouveau message" interne (le drawer fournit le sien) et de l'import `DriveFilePicker` (le bouton « Depuis Drive » disparaît). |
| `components/drive/DriveFileRow.tsx` | Nouvelles props optionnelles `attachMode?: boolean` et `onAttach?: (file) => void`. Si les deux fournies → afficher bouton « 📎 Joindre » au hover à la place de l'icône download. Mise à jour ligne 139 : `/dashboard/email` → `/dashboard/workspace`. |
| `components/drive/DriveExplorer.tsx` | Nouvelles props optionnelles `attachMode` et `onAttachFile`, propagées à chaque `DriveFileRow`. |
| `components/layout/Sidebar.tsx` | Supprimer entrées « Drive » (l. 57) et « Email » (l. 58) + leurs icônes (l. 28-37). Ajouter une seule entrée « Workspace » avec icône combinée. |
| `components/agent/AgentMessage.tsx` | Ligne 214 : `/dashboard/email?to=…` → `/dashboard/workspace?to=…` |
| `app/api/auth/google/route.ts` | Ligne 6 : défaut `'/dashboard/drive'` → `'/dashboard/workspace'` |
| `app/api/auth/google/callback/route.ts` | Ligne 23 : défaut `'/dashboard/drive'` → `'/dashboard/workspace'` |
| `next.config.js` | Ajouter `async redirects()` retournant 2 redirections 308 (`/dashboard/drive` et `/dashboard/email` → `/dashboard/workspace`). Les query params sont préservés automatiquement. |

### Files to delete

| Path | Raison |
|---|---|
| `app/dashboard/drive/page.tsx` | Remplacé par redirect dans next.config.js |
| `app/dashboard/drive/loading.tsx` | Plus accessible (redirect immédiat) |
| `app/dashboard/email/page.tsx` | Remplacé par redirect |
| `app/dashboard/email/loading.tsx` | Plus accessible |
| `components/email/DriveFilePicker.tsx` | Plus utilisé : la sélection se fait directement via le bouton « Joindre » dans `DriveExplorer` |

---

## Task 1 — Types partagés `Draft` et `Attachment`

**Files:**
- Create: `lib/workspace.ts`

- [ ] **Step 1: Créer le fichier de types**

```typescript
// lib/workspace.ts

export interface Attachment {
  type: 'drive' | 'local'
  fileId?: string         // si type === 'drive'
  fileName: string
  mimeType: string
  data?: string           // base64 si type === 'local' — NON persisté en localStorage
  size?: number
}

export interface Draft {
  to: string
  subject: string
  body: string
  attachments: Attachment[]
}

export const EMPTY_DRAFT: Draft = {
  to: '',
  subject: '',
  body: '',
  attachments: [],
}

/**
 * True dès qu'au moins un champ texte est non vide ou qu'il y a des PJ.
 * Sert à savoir si le brouillon doit être persisté / si le bouton header
 * doit afficher "Brouillon en cours" plutôt que "Nouveau mail".
 */
export function hasContent(draft: Draft): boolean {
  return (
    draft.to.trim().length > 0 ||
    draft.subject.trim().length > 0 ||
    draft.body.trim().length > 0 ||
    draft.attachments.length > 0
  )
}

/**
 * Filtre une copie du draft pour la sérialisation localStorage :
 * exclut les pièces jointes locales (base64 trop lourd, risque quota).
 * Les références Drive (fileId + métadonnées légères) sont conservées.
 */
export function toSerializableDraft(draft: Draft): Draft {
  return {
    ...draft,
    attachments: draft.attachments.filter(a => a.type === 'drive'),
  }
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `cd ~/commission-tracker/commission-tracker && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 3: Commit**

```bash
git add lib/workspace.ts
git commit -m "feat(workspace): types Draft et Attachment partagés

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Hook `useDraftPersistence` (TDD)

**Files:**
- Create: `hooks/useDraftPersistence.ts`
- Create: `__tests__/hooks/useDraftPersistence.test.tsx`

- [ ] **Step 1: Écrire les tests d'abord**

Créer `__tests__/hooks/useDraftPersistence.test.tsx` :

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDraftPersistence, DRAFT_STORAGE_KEY } from '@/hooks/useDraftPersistence'
import { EMPTY_DRAFT } from '@/lib/workspace'

describe('useDraftPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialise avec EMPTY_DRAFT quand localStorage est vide', () => {
    const { result } = renderHook(() => useDraftPersistence())
    expect(result.current.draft).toEqual(EMPTY_DRAFT)
    expect(result.current.restored).toBe(false)
  })

  it('restaure depuis localStorage si un brouillon non vide y est stocké', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Hello',
      attachments: [],
    }))
    const { result } = renderHook(() => useDraftPersistence())
    expect(result.current.draft.to).toBe('test@example.com')
    expect(result.current.draft.subject).toBe('Test')
    expect(result.current.restored).toBe(true)
  })

  it('persiste dans localStorage avec un debounce de 500ms', () => {
    const { result } = renderHook(() => useDraftPersistence())
    act(() => {
      result.current.setDraft({ ...EMPTY_DRAFT, to: 'a@b.fr' })
    })
    // Avant le debounce → rien dans localStorage
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    // Après 500ms → persisté
    act(() => { vi.advanceTimersByTime(500) })
    const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!)
    expect(stored.to).toBe('a@b.fr')
  })

  it('exclut les pièces jointes locales (base64) du localStorage', () => {
    const { result } = renderHook(() => useDraftPersistence())
    act(() => {
      result.current.setDraft({
        ...EMPTY_DRAFT,
        to: 'a@b.fr',
        attachments: [
          { type: 'drive', fileId: 'd1', fileName: 'doc.pdf', mimeType: 'application/pdf' },
          { type: 'local', fileName: 'photo.jpg', mimeType: 'image/jpeg', data: 'BASE64DATA', size: 1024 },
        ],
      })
    })
    act(() => { vi.advanceTimersByTime(500) })
    const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!)
    expect(stored.attachments).toHaveLength(1)
    expect(stored.attachments[0].type).toBe('drive')
  })

  it('clearDraft réinitialise et supprime la clé localStorage', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ to: 'x@y.fr', subject: '', body: '', attachments: [] }))
    const { result } = renderHook(() => useDraftPersistence())
    expect(result.current.draft.to).toBe('x@y.fr')
    act(() => { result.current.clearDraft() })
    expect(result.current.draft).toEqual(EMPTY_DRAFT)
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })
})
```

- [ ] **Step 2: Run pour vérifier les tests échouent**

Run: `cd ~/commission-tracker/commission-tracker && npx vitest run __tests__/hooks/useDraftPersistence.test.tsx`
Expected: FAIL — module `@/hooks/useDraftPersistence` introuvable

- [ ] **Step 3: Implémenter le hook**

Créer `hooks/useDraftPersistence.ts` :

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Draft, EMPTY_DRAFT, hasContent, toSerializableDraft } from '@/lib/workspace'

export const DRAFT_STORAGE_KEY = 'workspace.draft'
const DEBOUNCE_MS = 500

export function useDraftPersistence(): {
  draft: Draft
  setDraft: (d: Draft) => void
  clearDraft: () => void
  restored: boolean
} {
  const [draft, setDraftState] = useState<Draft>(EMPTY_DRAFT)
  const [restored, setRestored] = useState(false)
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restauration au montage (synchronisée pour que les tests voient l'état restauré)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Draft
        if (hasContent(parsed)) {
          setDraftState(parsed)
          setRestored(true)
        }
      }
    } catch (err) {
      console.warn('[workspace] localStorage indisponible à la lecture:', err)
    }
  }, [])

  const setDraft = useCallback((next: Draft) => {
    setDraftState(next)

    // Debounced write
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
    writeTimerRef.current = setTimeout(() => {
      try {
        if (hasContent(next)) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSerializableDraft(next)))
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY)
        }
      } catch (err) {
        console.warn('[workspace] localStorage indisponible à l\'écriture:', err)
      }
    }, DEBOUNCE_MS)
  }, [])

  const clearDraft = useCallback(() => {
    setDraftState(EMPTY_DRAFT)
    setRestored(false)
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (err) {
      console.warn('[workspace] localStorage indisponible au clear:', err)
    }
  }, [])

  return { draft, setDraft, clearDraft, restored }
}
```

- [ ] **Step 4: Run pour vérifier les tests passent**

Run: `cd ~/commission-tracker/commission-tracker && npx vitest run __tests__/hooks/useDraftPersistence.test.tsx`
Expected: PASS — 5 tests verts

- [ ] **Step 5: Run la suite complète pour s'assurer de zéro régression**

Run: `cd ~/commission-tracker/commission-tracker && npm test`
Expected: PASS — 30 tests verts (25 existants + 5 nouveaux)

- [ ] **Step 6: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur, 0 warning

- [ ] **Step 7: Commit**

```bash
git add hooks/useDraftPersistence.ts __tests__/hooks/useDraftPersistence.test.tsx
git commit -m "feat(workspace): hook useDraftPersistence avec persistance localStorage

Brouillon persisté avec debounce 500ms, restauré au montage, exclusion
des pièces jointes locales (base64) de la sérialisation pour éviter
de saturer le quota localStorage. Fallback silencieux si localStorage
est indisponible. 5 tests Vitest.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Refactor `EmailComposer` en mode contrôlé

**Files:**
- Modify: `components/email/EmailComposer.tsx` (réécriture quasi complète : 405 → ~330 lignes)

- [ ] **Step 1: Lire le fichier actuel pour référence**

Run: `cd ~/commission-tracker/commission-tracker && wc -l components/email/EmailComposer.tsx`
Expected: 405 lignes

- [ ] **Step 2: Réécrire le fichier complet**

Remplacer **intégralement** le contenu de `components/email/EmailComposer.tsx` par :

```typescript
'use client'

import { useState, useRef } from 'react'
import type { Draft, Attachment } from '@/lib/workspace'

interface EmailComposerProps {
  draft: Draft
  onDraftChange: (next: Draft) => void
  onSent?: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeColor(mimeType: string): string {
  if (mimeType.includes('pdf')) return '#f43f5e'
  if (mimeType.includes('document') || mimeType.includes('word')) return '#38bdf8'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '#10b981'
  if (mimeType.includes('image')) return '#818cf8'
  return '#8898aa'
}

export default function EmailComposer({ draft, onDraftChange, onSent }: EmailComposerProps) {
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<Draft>) => onDraftChange({ ...draft, ...patch })

  const addLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    const files = Array.from(fileList)
    let pending = files.length
    const collected: Attachment[] = []

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        collected.push({
          type: 'local',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64,
          size: file.size,
        })
        pending -= 1
        if (pending === 0) {
          update({ attachments: [...draft.attachments, ...collected] })
        }
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    update({ attachments: draft.attachments.filter((_, i) => i !== index) })
  }

  const handleSend = async () => {
    if (!draft.to || !draft.subject || !draft.body) {
      setStatus({ type: 'error', message: 'Remplissez tous les champs obligatoires' })
      return
    }

    setSending(true)
    setStatus(null)

    try {
      const payload = {
        to: draft.to,
        subject: draft.subject,
        body: draft.body.replace(/\n/g, '<br>'),
        attachments: draft.attachments.map(att =>
          att.type === 'drive'
            ? { type: 'drive' as const, fileId: att.fileId!, fileName: att.fileName, mimeType: att.mimeType }
            : { type: 'local' as const, data: att.data!, fileName: att.fileName, mimeType: att.mimeType }
        ),
      }

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setStatus({ type: 'success', message: 'Email envoyé avec succès !' })
        onSent?.()
      } else {
        const data = (await res.json()) as { error: string }
        setStatus({ type: 'error', message: data.error || 'Erreur lors de l\'envoi' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Champs */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4 gap-3">
        {/* Destinataire */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Destinataire
          </label>
          <input
            type="email"
            value={draft.to}
            onChange={e => update({ to: e.target.value })}
            placeholder="email@exemple.com"
            className="w-full px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Objet */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Objet
          </label>
          <input
            type="text"
            value={draft.subject}
            onChange={e => update({ subject: e.target.value })}
            placeholder="Objet de l'email"
            className="w-full px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Message */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Message
          </label>
          <textarea
            value={draft.body}
            onChange={e => update({ body: e.target.value })}
            placeholder="Rédigez votre message..."
            className="w-full flex-1 px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none resize-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              minHeight: '180px',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Pièces jointes */}
        {draft.attachments.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-2 block">
              Pièces jointes ({draft.attachments.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {draft.attachments.map((att, i) => (
                <div
                  key={`${att.fileName}-${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ color: getTypeColor(att.mimeType) }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>

                  <span className="text-txt2 truncate max-w-[140px]">{att.fileName}</span>

                  {att.size && (
                    <span className="text-txt3">{formatSize(att.size)}</span>
                  )}

                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                    style={{
                      backgroundColor: att.type === 'drive' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                      color: att.type === 'drive' ? '#f59e0b' : '#22c55e',
                    }}
                  >
                    {att.type === 'drive' ? 'Drive' : 'Local'}
                  </span>

                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-0.5 rounded hover:bg-[rgba(244,63,94,0.1)] transition-colors cursor-pointer"
                    aria-label="Supprimer la pièce jointe"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton ajout PJ locale (Drive géré depuis l'explorateur principal) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-txt2 transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.12)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.12)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Depuis mon PC
          </button>
          <span className="text-[10px] text-txt3 ml-1">
            (clic sur un fichier Drive à gauche pour l'attacher)
          </span>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={addLocalFiles}
          />
        </div>

        {/* Status */}
        {status && (
          <div
            className="rounded-lg px-4 py-2.5 text-sm"
            style={{
              backgroundColor: status.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)'}`,
              color: status.type === 'success' ? '#22c55e' : '#f43f5e',
            }}
          >
            {status.message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            if (!sending) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)'
          }}
        >
          {sending ? (
            <>
              <div
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }}
              />
              Envoi...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Envoyer
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

> **Notes sur les changements vs l'ancienne version :**
> - Suppression de l'import `DriveFilePicker` et de tout le state `showDrivePicker`
> - Suppression du header interne « Nouveau message » (le drawer le fournit)
> - Suppression du bouton « Annuler » (le drawer fournit la croix de fermeture)
> - Suppression du bouton « Depuis Drive » (remplacé par le clic direct sur les fichiers Drive)
> - Suppression du `useEffect` qui sync `initialAttachments`/`initialTo`/etc. (plus besoin, la page parent gère)
> - State `to/subject/body/attachments` → props `draft` + `onDraftChange`
> - State conservé en interne : `sending` et `status` (UI éphémère, pas du brouillon)

- [ ] **Step 3: Vérifier compilation et lint**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

> **NOTE :** À ce stade, le build entier va échouer car `app/dashboard/email/page.tsx` utilise encore les anciens props (`initialAttachments`, etc.). C'est attendu — on corrigera dans la Task 10 quand on supprimera cette page. Pour cette task, lint+typecheck suffisent.

- [ ] **Step 4: Vérifier que les tests existants passent**

Run: `cd ~/commission-tracker/commission-tracker && npm test`
Expected: 30 tests verts

- [ ] **Step 5: Commit**

```bash
git add components/email/EmailComposer.tsx
git commit -m "refactor(email): EmailComposer en mode contrôlé

Le composant ne possède plus son propre état de formulaire — il reçoit
draft + onDraftChange en props. Suppression du header interne et du
bouton 'Depuis Drive' (le drawer parent gère ces aspects). Suppression
du DriveFilePicker (remplacé par le clic direct sur les fichiers Drive
de l'explorateur). Pré-requis pour le merge Workspace.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `DriveFileRow` : mode attach

**Files:**
- Modify: `components/drive/DriveFileRow.tsx`

- [ ] **Step 1: Lire le fichier pour cibler l'interface props et les actions**

Run: `cd ~/commission-tracker/commission-tracker && head -30 components/drive/DriveFileRow.tsx`

L'interface props actuelle est `{ file, onDelete }`. On y ajoute `attachMode` et `onAttach`.

- [ ] **Step 2: Modifier l'interface props et la signature**

Dans `components/drive/DriveFileRow.tsx`, l'interface `DriveFileRowProps` se trouve aux lignes 13-16. La remplacer par :

```typescript
interface DriveFileRowProps {
  file: DriveFile
  onDelete?: () => void
  attachMode?: boolean
  onAttach?: (file: DriveFile) => void
}
```

Et mettre à jour la signature de la fonction (qui suit l'interface) pour destructurer les nouvelles props :

```typescript
export default function DriveFileRow({ file, onDelete, attachMode = false, onAttach }: DriveFileRowProps) {
  // ... corps existant inchangé
```

> `onDelete` est conservé optionnel (`?:`) comme dans l'original.

- [ ] **Step 3: Mettre à jour le lien email vers /dashboard/workspace**

Trouver la ligne 139 (bouton "Envoyer par email") et remplacer :

```typescript
// AVANT
window.location.href = `/dashboard/email?attach=${file.id}&name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.mimeType)}`

// APRÈS
window.location.href = `/dashboard/workspace?attach=${file.id}&name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.mimeType)}`
```

- [ ] **Step 4: Ajouter le bouton « Joindre » conditionnel**

Dans le bloc d'actions au hover (juste avant ou après le bouton « Envoyer par email » existant), ajouter le bouton conditionnel :

```typescript
{attachMode && onAttach && (
  <button
    onClick={() => onAttach(file)}
    className="px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
    style={{
      backgroundColor: 'rgba(99,102,241,0.15)',
      color: '#818cf8',
      border: '1px solid rgba(99,102,241,0.25)',
    }}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)' }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.15)' }}
    title="Joindre au brouillon en cours"
  >
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
    Joindre
  </button>
)}
```

> **Placement :** insérer ce bloc immédiatement **avant** le bouton « Envoyer par email » existant (l'ancienne icône enveloppe), de sorte que « Joindre » prend la priorité visuelle quand le drawer est ouvert. Le bouton « Envoyer par email » reste utile quand `attachMode === false`.

- [ ] **Step 5: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 6: Commit**

```bash
git add components/drive/DriveFileRow.tsx
git commit -m "feat(drive): DriveFileRow supporte le mode attach

Nouvelles props attachMode + onAttach. Quand les deux sont fournies,
un bouton 'Joindre' apparaît au hover en plus des actions habituelles,
permettant d'ajouter le fichier au brouillon email en cours. Le lien
'Envoyer par email' pointe maintenant vers /dashboard/workspace.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — `DriveExplorer` : propager les props attach

**Files:**
- Modify: `components/drive/DriveExplorer.tsx`

- [ ] **Step 1: Ajouter les props à la signature**

Dans `components/drive/DriveExplorer.tsx`, modifier la signature du composant pour accepter les nouvelles props optionnelles :

```typescript
interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
}

interface DriveExplorerProps {
  attachMode?: boolean
  onAttachFile?: (file: DriveFile) => void
}

export default function DriveExplorer({ attachMode = false, onAttachFile }: DriveExplorerProps = {}) {
  // ... reste du code inchangé
```

> Le `= {}` après les props permet à l'appel actuel `<DriveExplorer />` (sans props) de continuer à fonctionner pendant la transition.

- [ ] **Step 2: Propager les props à chaque DriveFileRow**

Trouver l'appel `<DriveFileRow key={file.id} file={file} onDelete={() => fetchFiles(currentFolderId)} />` (autour de la ligne 300) et le remplacer par :

```typescript
<DriveFileRow
  key={file.id}
  file={file}
  onDelete={() => fetchFiles(currentFolderId)}
  attachMode={attachMode}
  onAttach={onAttachFile}
/>
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 4: Commit**

```bash
git add components/drive/DriveExplorer.tsx
git commit -m "feat(drive): DriveExplorer propage attachMode aux lignes fichier

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — `EmailDrawer` : tiroir latéral animé

**Files:**
- Create: `components/workspace/EmailDrawer.tsx`

- [ ] **Step 1: Créer le dossier**

Run: `cd ~/commission-tracker/commission-tracker && mkdir -p components/workspace`

- [ ] **Step 2: Créer le fichier**

```typescript
'use client'

import EmailComposer from '@/components/email/EmailComposer'
import type { Draft } from '@/lib/workspace'

interface EmailDrawerProps {
  open: boolean
  draft: Draft
  onDraftChange: (next: Draft) => void
  onClose: () => void
  onSent: () => void
}

export default function EmailDrawer({ open, draft, onDraftChange, onClose, onSent }: EmailDrawerProps) {
  return (
    <div
      aria-hidden={!open}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(460px, 100vw)',
        maxWidth: '100vw',
        backgroundColor: '#0f1117',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#6366f1',
              boxShadow: '0 0 10px rgba(99,102,241,0.6)',
            }}
          />
          <h2 className="text-sm font-semibold text-txt">Nouveau message</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer le tiroir email"
          className="cursor-pointer rounded-md transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8898aa',
            padding: '6px 10px',
            fontSize: '16px',
            lineHeight: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          ✕
        </button>
      </div>

      {/* Composer */}
      <div className="flex-1 min-h-0">
        <EmailComposer
          draft={draft}
          onDraftChange={onDraftChange}
          onSent={onSent}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 4: Commit**

```bash
git add components/workspace/EmailDrawer.tsx
git commit -m "feat(workspace): EmailDrawer — tiroir latéral animé

Panneau fixed à droite, 460px desktop, fade+slide 200ms, contient
EmailComposer en mode contrôlé. Header avec titre + bouton de
fermeture. Aria-hidden quand fermé pour l'accessibilité.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — `WorkspaceHeader` : titre + bouton Nouveau mail / Brouillon

**Files:**
- Create: `components/workspace/WorkspaceHeader.tsx`

- [ ] **Step 1: Créer le fichier**

```typescript
'use client'

interface WorkspaceHeaderProps {
  hasDraft: boolean
  attachmentCount: number
  drawerOpen: boolean
  onOpenDrawer: () => void
}

export default function WorkspaceHeader({ hasDraft, attachmentCount, drawerOpen, onOpenDrawer }: WorkspaceHeaderProps) {
  // Quand le drawer est ouvert, on masque le bouton (le drawer est déjà visible)
  if (drawerOpen) {
    return (
      <div className="px-6 md:px-10 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-txt mb-1">Workspace</h1>
        <p className="text-sm text-txt2">
          Vos fichiers Google Drive et la composition d&apos;emails au même endroit
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-10 pt-6 pb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-txt mb-1">Workspace</h1>
        <p className="text-sm text-txt2">
          Vos fichiers Google Drive et la composition d&apos;emails au même endroit
        </p>
      </div>

      <button
        onClick={onOpenDrawer}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-all duration-200 flex-shrink-0"
        style={
          hasDraft
            ? {
                backgroundColor: 'rgba(99,102,241,0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: 'none',
              }
            : {
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }
        }
        onMouseEnter={e => {
          if (hasDraft) {
            e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)'
          } else {
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.45)'
          }
        }}
        onMouseLeave={e => {
          if (hasDraft) {
            e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.15)'
          } else {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'
          }
        }}
      >
        {hasDraft ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
            Brouillon en cours
            {attachmentCount > 0 && (
              <span
                style={{
                  backgroundColor: 'rgba(245,158,11,0.18)',
                  color: '#f59e0b',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {attachmentCount} PJ
              </span>
            )}
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Nouveau mail
          </>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 3: Commit**

```bash
git add components/workspace/WorkspaceHeader.tsx
git commit -m "feat(workspace): WorkspaceHeader avec bouton brouillon contextuel

Bouton 'Nouveau mail' devient 'Brouillon en cours' + badge nb PJ
quand un brouillon est en cours et que le drawer est fermé. Masqué
quand le drawer est ouvert pour éviter la redondance.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — `WorkspacePage` : page principale

**Files:**
- Create: `app/dashboard/workspace/page.tsx`
- Create: `app/dashboard/workspace/loading.tsx`

- [ ] **Step 1: Créer le dossier**

Run: `cd ~/commission-tracker/commission-tracker && mkdir -p app/dashboard/workspace`

- [ ] **Step 2: Créer `loading.tsx`**

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div
        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Créer `page.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DriveExplorer from '@/components/drive/DriveExplorer'
import EmailDrawer from '@/components/workspace/EmailDrawer'
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader'
import { useDraftPersistence } from '@/hooks/useDraftPersistence'
import { hasContent, type Attachment } from '@/lib/workspace'

interface DriveFile {
  id: string
  name: string
  mimeType: string
}

function WorkspaceContent() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [restoredToast, setRestoredToast] = useState(false)
  const { draft, setDraft, clearDraft, restored } = useDraftPersistence()

  // Check connexion Google (une seule fois)
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/drive/list?folderId=root')
        if (res.ok) {
          setConnected(true)
        } else {
          const data = (await res.json()) as { error: string }
          setConnected(data.error !== 'not_connected')
        }
      } catch {
        setConnected(false)
      }
    }
    check()
  }, [])

  // Restauration brouillon → ouvrir le tiroir + toast
  useEffect(() => {
    if (restored) {
      setDrawerOpen(true)
      setRestoredToast(true)
      const t = setTimeout(() => setRestoredToast(false), 4000)
      return () => clearTimeout(t)
    }
  }, [restored])

  // Pré-remplissage depuis query params (Reem AI ou ancien lien Drive)
  // S'exécute après le mount ; ne déclenche pas si le brouillon a déjà été restauré.
  useEffect(() => {
    if (restored) return
    const attachFileId = searchParams.get('attach')
    const attachName = searchParams.get('name')
    const attachMime = searchParams.get('mime')
    const to = searchParams.get('to') ?? ''
    const subject = searchParams.get('subject') ?? ''
    const body = searchParams.get('body') ?? ''

    const attachments: Attachment[] = []
    if (attachFileId && attachName) {
      attachments.push({
        type: 'drive',
        fileId: attachFileId,
        fileName: attachName,
        mimeType: attachMime ?? 'application/octet-stream',
      })
    }

    if (attachments.length > 0 || to || subject || body) {
      setDraft({ to, subject, body, attachments })
      setDrawerOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const attachFileFromDrive = useCallback((file: DriveFile) => {
    const newAttachment: Attachment = {
      type: 'drive',
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
    }
    setDraft({
      ...draft,
      attachments: [...draft.attachments, newAttachment],
    })
    if (!drawerOpen) setDrawerOpen(true)
  }, [draft, drawerOpen, setDraft])

  const handleSent = useCallback(() => {
    clearDraft()
    setDrawerOpen(false)
  }, [clearDraft])

  // Loading
  if (connected === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
          />
          <span className="text-sm text-txt2">Vérification de la connexion Google...</span>
        </div>
      </div>
    )
  }

  // Non connecté
  if (connected === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-txt mb-2">
          Connectez Google
        </h2>
        <p className="text-sm text-txt2 mb-6 text-center max-w-md">
          Accédez à vos fichiers Drive et envoyez des emails depuis l&apos;application.
        </p>
        <a
          href="/api/auth/google?redirect=/dashboard/workspace"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Connecter Google
        </a>
      </div>
    )
  }

  // Connecté
  return (
    <div className="min-h-screen flex flex-col">
      <WorkspaceHeader
        hasDraft={hasContent(draft)}
        attachmentCount={draft.attachments.length}
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <div className="flex-1 px-6 md:px-10 pb-10">
        <DriveExplorer
          attachMode={drawerOpen}
          onAttachFile={attachFileFromDrive}
        />
      </div>

      <EmailDrawer
        open={drawerOpen}
        draft={draft}
        onDraftChange={setDraft}
        onClose={() => setDrawerOpen(false)}
        onSent={handleSent}
      />

      {/* Toast de restauration */}
      {restoredToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#151a24',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#e8edf5',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          📝 Brouillon restauré
        </div>
      )}
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
        />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

> Le build entier ne passera toujours pas tant que `app/dashboard/email/page.tsx` utilise les anciens props EmailComposer (Task 10 corrige ça).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/workspace/
git commit -m "feat(workspace): page principale /dashboard/workspace

Page qui héberge DriveExplorer + EmailDrawer + WorkspaceHeader.
Gère le check de connexion Google (un seul fetch), l'état du
brouillon via useDraftPersistence, la restauration au montage,
le pré-remplissage via query params Reem AI, et l'attachement
direct des fichiers Drive au brouillon.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — Sidebar : remplacer Drive + Email par Workspace

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Supprimer les anciennes icônes du dictionnaire NAV_ICONS**

Dans `components/layout/Sidebar.tsx`, **supprimer** les blocs `'/dashboard/drive': (...)` (lignes 28-32) et `'/dashboard/email': (...)` (lignes 33-37) du dictionnaire `NAV_ICONS`.

- [ ] **Step 2: Ajouter l'icône Workspace au dictionnaire**

Au même endroit, juste avant `'/dashboard/chat'`, ajouter :

```typescript
'/dashboard/workspace': (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    <path d="M8 12h8M8 16h5"/>
  </svg>
),
```

> Cette icône est un dossier (Drive) avec des lignes intérieures suggérant du contenu/texte (Email). Combinaison visuelle simple, lisible à 18px.

- [ ] **Step 3: Mettre à jour `NAV_ITEMS`**

Trouver `NAV_ITEMS` (autour de la ligne 53) et remplacer les deux entrées Drive + Email par une seule :

```typescript
// AVANT
const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard' },
  { label: 'Clients',      href: '/dashboard/clients' },
  { label: 'Facturation',  href: '/dashboard/invoices' },
  { label: 'Drive',        href: '/dashboard/drive' },
  { label: 'Email',        href: '/dashboard/email' },
  { label: 'Chat',         href: '/dashboard/chat' },
  { label: 'Reem AI',      href: '/dashboard/agent' },
]

// APRÈS
const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard' },
  { label: 'Clients',      href: '/dashboard/clients' },
  { label: 'Facturation',  href: '/dashboard/invoices' },
  { label: 'Workspace',    href: '/dashboard/workspace' },
  { label: 'Chat',         href: '/dashboard/chat' },
  { label: 'Reem AI',      href: '/dashboard/agent' },
]
```

- [ ] **Step 4: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 5: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat(sidebar): remplacer Drive + Email par une seule entrée Workspace

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — Mettre à jour les liens internes restants

**Files:**
- Modify: `components/agent/AgentMessage.tsx` (l. 214)
- Modify: `app/api/auth/google/route.ts` (l. 6)
- Modify: `app/api/auth/google/callback/route.ts` (l. 23)

> **Note :** la modification de `components/drive/DriveFileRow.tsx` ligne 139 a déjà été faite dans la Task 4.

- [ ] **Step 1: AgentMessage — lien Reem AI**

Dans `components/agent/AgentMessage.tsx`, ligne 214, remplacer :

```typescript
// AVANT
const href = `/dashboard/email?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

// APRÈS
const href = `/dashboard/workspace?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
```

- [ ] **Step 2: OAuth route — défaut redirection**

Dans `app/api/auth/google/route.ts`, ligne 6, remplacer :

```typescript
// AVANT
const redirect = request.nextUrl.searchParams.get('redirect') ?? '/dashboard/drive'

// APRÈS
const redirect = request.nextUrl.searchParams.get('redirect') ?? '/dashboard/workspace'
```

- [ ] **Step 3: OAuth callback — défaut redirection**

Dans `app/api/auth/google/callback/route.ts`, ligne 23, remplacer :

```typescript
// AVANT
const redirectPath = state && state.startsWith('/dashboard') ? state : '/dashboard/drive'

// APRÈS
const redirectPath = state && state.startsWith('/dashboard') ? state : '/dashboard/workspace'
```

- [ ] **Step 4: Lint + typecheck**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint && npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 5: Commit**

```bash
git add components/agent/AgentMessage.tsx app/api/auth/google/route.ts app/api/auth/google/callback/route.ts
git commit -m "chore: rediriger les liens internes vers /dashboard/workspace

Reem AI EmailCard, OAuth Google route et callback pointent
maintenant vers le nouveau Workspace au lieu des anciens
/dashboard/drive et /dashboard/email.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — Supprimer les anciennes pages + ajouter les redirections + supprimer DriveFilePicker

**Files:**
- Modify: `next.config.js`
- Delete: `app/dashboard/drive/page.tsx`
- Delete: `app/dashboard/drive/loading.tsx`
- Delete: `app/dashboard/email/page.tsx`
- Delete: `app/dashboard/email/loading.tsx`
- Delete: `components/email/DriveFilePicker.tsx`

- [ ] **Step 1: Ajouter les redirections dans next.config.js**

Remplacer **intégralement** le contenu de `next.config.js` par :

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcryptjs'],
  async redirects() {
    return [
      {
        source: '/dashboard/drive',
        destination: '/dashboard/workspace',
        permanent: true,
      },
      {
        source: '/dashboard/email',
        destination: '/dashboard/workspace',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
```

> Les redirections Next.js préservent les query params automatiquement (`/dashboard/email?attach=xxx` → `/dashboard/workspace?attach=xxx`).

- [ ] **Step 2: Supprimer les anciennes pages**

Run:
```bash
cd ~/commission-tracker/commission-tracker
rm -rf app/dashboard/drive app/dashboard/email
```

- [ ] **Step 3: Supprimer DriveFilePicker**

Run:
```bash
rm components/email/DriveFilePicker.tsx
```

- [ ] **Step 4: Vérifier qu'aucun fichier ne référence encore les anciens chemins**

Run: `cd ~/commission-tracker/commission-tracker && grep -rn "DriveFilePicker\|app/dashboard/drive\|app/dashboard/email" --include="*.ts" --include="*.tsx" .`
Expected: aucun match (seuls les fichiers `next.config.js` et `docs/` peuvent contenir les patterns dans le `redirects()` et la doc, c'est OK)

- [ ] **Step 5: Build complet**

Run: `cd ~/commission-tracker/commission-tracker && npm run build`
Expected: build OK, sans erreur

- [ ] **Step 6: Run tous les tests**

Run: `cd ~/commission-tracker/commission-tracker && npm test`
Expected: 30 tests verts

- [ ] **Step 7: Lint final**

Run: `cd ~/commission-tracker/commission-tracker && npm run lint`
Expected: 0 warning, 0 erreur

- [ ] **Step 8: Commit**

```bash
git add next.config.js
git rm -r app/dashboard/drive app/dashboard/email components/email/DriveFilePicker.tsx
git commit -m "chore(workspace): supprimer les anciennes pages + redirections 308

Les routes /dashboard/drive et /dashboard/email redirigent
maintenant vers /dashboard/workspace via next.config.js
(query params préservés automatiquement). Suppression des
fichiers obsolètes : pages drive/email + DriveFilePicker
(remplacé par le clic direct depuis l'explorateur Drive).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — Vérification finale + checklist manuelle

**Goal:** Confirmer zéro régression sur tous les flux critiques avant de considérer le merge terminé.

- [ ] **Step 1: Lancer un sous-agent reviewer pour audit final**

Dispatcher un agent `Explore` (subagent_type=Explore) avec ce prompt :

```
Audite la cohérence et l'absence de régression de la fusion Drive+Email
en Workspace dans le projet ~/commission-tracker/commission-tracker.

Vérifie :
1. Aucun import cassé vers DriveFilePicker ou app/dashboard/{drive,email}
2. Sidebar.tsx n'a plus d'entrée Drive ou Email isolée
3. Tous les composants qui utilisent EmailComposer le font avec les
   nouvelles props (draft, onDraftChange) — aucun usage des anciennes
   (initialAttachments, initialTo, etc.)
4. Les redirections dans next.config.js sont bien définies pour les
   deux anciennes routes
5. L'OAuth Google par défaut pointe vers /dashboard/workspace dans
   les deux fichiers route.ts et callback/route.ts
6. La signature LR Consulting dans app/api/email/send/route.ts n'est
   PAS modifiée (vérification critique non-régression)
7. Le hook useDraftPersistence ne tente pas de sérialiser des
   pièces jointes locales (base64) dans localStorage

Rapporte tout problème trouvé en moins de 200 mots.
```

- [ ] **Step 2: Démarrer le serveur dev pour tester manuellement**

Run: `cd ~/commission-tracker/commission-tracker && lsof -ti:3000 | xargs -r kill ; npm run dev`

> Note : si un serveur tourne déjà sur le 3000, utiliser le PID exact (jamais `pkill -f`).

- [ ] **Step 3: Checklist manuelle (l'utilisateur valide chaque point)**

Aller sur `http://localhost:3000/dashboard/workspace` et confirmer chaque item :

- [ ] Sidebar : une seule entrée « Workspace » au lieu de Drive + Email
- [ ] La page charge, le check Google est fait une seule fois, l'explorateur Drive s'affiche
- [ ] Cliquer « + Nouveau mail » → le tiroir glisse depuis la droite (animation 200ms)
- [ ] Composer un mail texte sans PJ : remplir À/Objet/Message, cliquer Envoyer → succès, signature LR Consulting présente dans le mail reçu
- [ ] Survoler un fichier Drive avec le tiroir ouvert → bouton « 📎 Joindre » apparaît à la place du bouton download
- [ ] Cliquer « Joindre » → le fichier apparaît dans les chips du tiroir avec badge `DRIVE`
- [ ] Cliquer « Depuis mon PC » dans le tiroir → upload local → chip avec badge `LOCAL`
- [ ] Fermer le tiroir avec ✕ → le bouton du header devient « 📝 Brouillon en cours » avec badge `1 PJ` (ou plus)
- [ ] Rouvrir le tiroir → tous les champs sont préservés
- [ ] Refresh navigateur (F5) → le tiroir se rouvre tout seul, le brouillon est restauré, toast « 📝 Brouillon restauré » s'affiche 4s
- [ ] Vérifier que les pièces jointes locales ont disparu après refresh (par design — message de section 4 du spec) mais que les références Drive sont là
- [ ] Envoyer le brouillon → tiroir se ferme, brouillon est nettoyé, `localStorage.getItem('workspace.draft')` renvoie `null` (vérifier dans la console DevTools)
- [ ] Aller sur `http://localhost:3000/dashboard/email?to=test@test.fr&subject=hello&body=test` → redirige vers `/dashboard/workspace`, tiroir ouvert avec champs pré-remplis
- [ ] Aller sur `http://localhost:3000/dashboard/drive?attach=FAKEID&name=test.pdf&mime=application/pdf` → redirige vers `/dashboard/workspace`, tiroir ouvert avec PJ pré-attachée (l'envoi échouera car FAKEID, c'est attendu)
- [ ] Aller sur `http://localhost:3000/dashboard/drive` (sans query) → redirige vers `/dashboard/workspace`
- [ ] Depuis Reem AI : générer un email via l'agent IA, cliquer le lien → ouvre `/dashboard/workspace` avec le brouillon pré-rempli
- [ ] Tester le bouton « Envoyer par email » sur un fichier Drive (avec tiroir fermé) → ouvre `/dashboard/workspace?attach=…` qui ouvre le tiroir avec la PJ
- [ ] Se déconnecter de Google (effacer le cookie `google_tokens` dans DevTools) puis recharger `/dashboard/workspace` → écran « Connectez Google » s'affiche
- [ ] Cliquer « Connecter Google » → après OAuth réussi, on revient sur `/dashboard/workspace` (et non `/dashboard/drive`)

- [ ] **Step 4: Si tout passe, commit final**

S'il n'y a pas eu de fix supplémentaire à faire à ce stade, aucun commit n'est nécessaire — la task n'est qu'une vérification.

Si un fix mineur a dû être appliqué pendant la vérif manuelle :

```bash
git add <fichiers concernés>
git commit -m "fix(workspace): <description du fix>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Mettre à jour la mémoire projet**

Mettre à jour `~/.claude/projects/-Users-hugueshenridelpit/memory/project_commission_tracker.md` pour refléter la nouvelle structure (Workspace au lieu de Drive + Email).

---

## Critères de succès (rappel du spec)

Le merge est considéré comme **réussi** si **tous** les points suivants sont vérifiés :

1. ✅ Tous les tests fonctionnels manuels de la Task 12 passent
2. ✅ `npm run lint && npx tsc --noEmit && npm run build && npm test` passent sans erreur
3. ✅ Un email envoyé depuis le tiroir contient la signature LR Consulting (vérification dans la boîte de réception)
4. ✅ Le brouillon survit à un refresh navigateur
5. ✅ Aucune régression sur Reem AI (génération de liens email avec PJ Drive)
6. ✅ Le sidebar a une seule entrée « Workspace » au lieu de deux
7. ✅ Le sous-agent code-reviewer ne signale aucun problème sur les fichiers touchés
