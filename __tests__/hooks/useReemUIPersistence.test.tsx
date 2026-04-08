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
