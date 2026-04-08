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
