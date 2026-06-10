'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  exiting: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const typeStyles: Record<ToastType, { border: string; icon: string }> = {
  success: { border: 'border-[rgba(61,220,139,0.30)]', icon: '✓' },
  error:   { border: 'border-[rgba(255,99,105,0.30)]', icon: '✕' },
  info:    { border: 'border-[rgba(106,141,255,0.30)]', icon: 'ℹ' },
  warning: { border: 'border-[rgba(240,163,60,0.30)]', icon: '⚠' },
}

const typeTextColors: Record<ToastType, string> = {
  success: 'text-[#3ddc8b]',
  error:   'text-[#ff8589]',
  info:    'text-[#6a8dff]',
  warning: 'text-[#f0a33c]',
}

function ToastNotification({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const style = typeStyles[item.type]
  const textColor = typeTextColors[item.type]

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-full border
        bg-[rgba(255,255,255,0.07)] backdrop-blur-[30px] ${style.border}
        shadow-[0_12px_44px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.13)]
        ${item.exiting ? 'animate-toastOut' : 'animate-toastIn'}
      `}
      style={{ minWidth: 280, maxWidth: 420 }}
    >
      <span className={`text-base font-semibold flex-shrink-0 ${textColor}`}>
        {style.icon}
      </span>
      <span className="text-lg-text text-sm flex-1">{item.message}</span>
      <button
        onClick={onClose}
        className="text-lg-muted hover:text-lg-text transition-colors flex-shrink-0 ml-2 p-0.5"
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    const exitTimer = setTimeout(() => {
      timersRef.current.delete(exitTimer)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 300)
    timersRef.current.add(exitTimer)
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type, exiting: false }])
    const autoTimer = setTimeout(() => {
      timersRef.current.delete(autoTimer)
      removeToast(id)
    }, 4000)
    timersRef.current.add(autoTimer)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted && createPortal(
        <div
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
        >
          {toasts.map(item => (
            <div key={item.id} className="pointer-events-auto">
              <ToastNotification item={item} onClose={() => removeToast(item.id)} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans un ToastProvider')
  return ctx
}
