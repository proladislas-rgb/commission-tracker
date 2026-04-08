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
        const target = e.target as HTMLElement | null
        // Ne pas intercepter si l'utilisateur tape dans un input/textarea
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
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
