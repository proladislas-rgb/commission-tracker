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
