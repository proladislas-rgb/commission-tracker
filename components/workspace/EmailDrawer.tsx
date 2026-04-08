'use client'

import { useState } from 'react'
import EmailComposer from '@/components/email/EmailComposer'
import { hasContent, type Draft } from '@/lib/workspace'

interface EmailDrawerProps {
  open: boolean
  draft: Draft
  onDraftChange: (next: Draft) => void
  onClose: () => void
  onSent: () => void
  onDiscard: () => void
}

export default function EmailDrawer({ open, draft, onDraftChange, onClose, onSent, onDiscard }: EmailDrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const draftHasContent = hasContent(draft)

  const handleDiscardClick = () => {
    if (confirmDiscard) {
      onDiscard()
      setConfirmDiscard(false)
    } else {
      setConfirmDiscard(true)
    }
  }

  const handleClose = () => {
    setConfirmDiscard(false)
    onClose()
  }

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

        <div className="flex items-center gap-1">
          {/* Bouton supprimer brouillon — visible uniquement si le brouillon a du contenu */}
          {draftHasContent && (
            <button
              type="button"
              onClick={handleDiscardClick}
              onBlur={() => setConfirmDiscard(false)}
              aria-label={confirmDiscard ? 'Confirmer la suppression du brouillon' : 'Supprimer le brouillon'}
              title={confirmDiscard ? 'Confirmer la suppression' : 'Supprimer le brouillon'}
              className="cursor-pointer rounded-md transition-colors flex items-center gap-1.5"
              style={{
                background: confirmDiscard ? 'rgba(244,63,94,0.15)' : 'transparent',
                border: `1px solid ${confirmDiscard ? 'rgba(244,63,94,0.3)' : 'transparent'}`,
                color: confirmDiscard ? '#f43f5e' : '#8898aa',
                padding: confirmDiscard ? '5px 10px' : '6px 8px',
                fontSize: '11px',
                fontWeight: confirmDiscard ? 600 : 400,
                lineHeight: 1,
              }}
              onMouseEnter={e => {
                if (!confirmDiscard) {
                  e.currentTarget.style.backgroundColor = 'rgba(244,63,94,0.08)'
                  e.currentTarget.style.color = '#f43f5e'
                }
              }}
              onMouseLeave={e => {
                if (!confirmDiscard) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#8898aa'
                }
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {confirmDiscard && <span>Confirmer</span>}
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
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
