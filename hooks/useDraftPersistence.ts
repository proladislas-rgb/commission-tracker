'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Draft, EMPTY_DRAFT, hasContent, toSerializableDraft } from '@/lib/workspace'

export const DRAFT_STORAGE_KEY = 'workspace.draft'
const DEBOUNCE_MS = 500

function isDraftLike(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.to === 'string' &&
    typeof v.subject === 'string' &&
    typeof v.body === 'string' &&
    Array.isArray(v.attachments)
  )
}

function loadFromStorage(): { draft: Draft; restored: boolean } {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isDraftLike(parsed) && hasContent(parsed)) {
        return { draft: parsed, restored: true }
      }
    }
  } catch (err) {
    console.warn('[workspace] localStorage indisponible à la lecture:', err)
  }
  return { draft: EMPTY_DRAFT, restored: false }
}

type DraftUpdater = Draft | ((prev: Draft) => Draft)

export function useDraftPersistence(): {
  draft: Draft
  setDraft: (next: DraftUpdater) => void
  clearDraft: () => void
  restored: boolean
} {
  const [{ draft, restored }, setState] = useState(() => loadFromStorage())
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
    }
  }, [])

  const setDraft = useCallback((next: DraftUpdater) => {
    setState(prev => {
      const resolved = typeof next === 'function' ? (next as (p: Draft) => Draft)(prev.draft) : next

      // Reschedule debounced write based on the resolved value
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
      writeTimerRef.current = setTimeout(() => {
        try {
          if (hasContent(resolved)) {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(toSerializableDraft(resolved)))
          } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
          }
        } catch (err) {
          console.warn('[workspace] localStorage indisponible à l\'écriture:', err)
        }
      }, DEBOUNCE_MS)

      return { ...prev, draft: resolved }
    })
  }, [])

  const clearDraft = useCallback(() => {
    setState({ draft: EMPTY_DRAFT, restored: false })
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch (err) {
      console.warn('[workspace] localStorage indisponible au clear:', err)
    }
  }, [])

  return { draft, setDraft, clearDraft, restored }
}
