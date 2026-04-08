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

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-[#10b981]/15', border: 'border-[#10b981]/40', icon: '✓' },
  error:   { bg: 'bg-[#f43f5e]/15', border: 'border-[#f43f5e]/40', icon: '✕' },
  info:    { bg: 'bg-[#6366f1]/15', border: 'border-[#6366f1]/40', icon: 'ℹ' },
  warning: { bg: 'bg-[#f59e0b]/15', border: 'border-[#f59e0b]/40', icon: '⚠' },
}

const typeTextColors: Record<ToastType, string> = {
  success: 'text-[#10b981]',
  error:   'text-[#f43f5e]',
  info:    'text-[#6366f1]',
  warning: 'text-[#f59e0b]',
}

function ToastNotification({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const style = typeStyles[item.type]
  const textColor = typeTextColors[item.type]

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-[8px] border backdrop-blur-sm
        ${style.bg} ${style.border}
        shadow-lg shadow-black/20
        ${item.exiting ? 'animate-toastOut' : 'animate-toastIn'}
      `}
      style={{ minWidth: 280, maxWidth: 420 }}
    >
      <span className={`text-base font-semibold flex-shrink-0 ${textColor}`}>
        {style.icon}
      </span>
      <span className="text-[#e8edf5] text-sm flex-1">{item.message}</span>
      <button
        onClick={onClose}
        className="text-[#8898aa] hover:text-[#e8edf5] transition-colors flex-shrink-0 ml-2 p-0.5"
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
