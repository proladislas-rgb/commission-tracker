'use client'

import { useState, useCallback, useRef } from 'react'
import { Draft, EMPTY_DRAFT, hasContent, toSerializableDraft } from '@/lib/workspace'

export const DRAFT_STORAGE_KEY = 'workspace.draft'
const DEBOUNCE_MS = 500

function loadFromStorage(): { draft: Draft; restored: boolean } {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Draft
      if (hasContent(parsed)) {
        return { draft: parsed, restored: true }
      }
    }
  } catch (err) {
    console.warn('[workspace] localStorage indisponible à la lecture:', err)
  }
  return { draft: EMPTY_DRAFT, restored: false }
}

export function useDraftPersistence(): {
  draft: Draft
  setDraft: (d: Draft) => void
  clearDraft: () => void
  restored: boolean
} {
  const [{ draft, restored }, setState] = useState(() => loadFromStorage())
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setDraft = useCallback((next: Draft) => {
    setState(prev => ({ ...prev, draft: next }))

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
