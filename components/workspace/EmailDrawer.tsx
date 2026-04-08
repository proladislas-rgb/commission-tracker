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
          type="button"
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
