'use client'

import { useRef, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAgentMessages } from '@/hooks/useAgentMessages'
import { useReemContext } from '@/hooks/useReemContext'
import { getSuggestions } from '@/lib/reem-suggestions'
import { avatarInitials } from '@/lib/utils'
import AgentMessageComponent from '@/components/agent/AgentMessage'
import AgentInput from '@/components/agent/AgentInput'

interface ReemPanelProps {
  onClose: () => void
  onHide: () => void
  draftMessage: string
  onDraftChange: (next: string) => void
}

export default function ReemPanel({ onClose, onHide, draftMessage, onDraftChange }: ReemPanelProps) {
  const { user } = useAuth()
  const context = useReemContext()
  const { messages, sending, sendMessage, clearHistory } = useAgentMessages(user?.id)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displayName = user?.display_name ?? ''
  const initials = displayName ? avatarInitials(displayName) : 'U'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = (message: string) => {
    sendMessage(message, context)
    onDraftChange('')
  }

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion, context)
  }

  const suggestions = getSuggestions(context.pathname)
  const showSuggestions = messages.length === 0 && !sending && !showHistory

  return (
    <div
      role="dialog"
      aria-label="Reem AI — assistante"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: 'min(380px, calc(100vw - 40px))',
        height: 'min(540px, calc(100vh - 40px))',
        backgroundColor: '#0f1117',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '14px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 6px rgba(99,102,241,0.05)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8edf5', lineHeight: 1.2 }}>Reem AI</div>
            <div style={{ fontSize: '10px', color: '#8898aa', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              contexte : {context.pageLabel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowHistory(prev => !prev)}
            aria-label={showHistory ? 'Fermer l\'historique' : 'Voir l\'historique'}
            title={showHistory ? 'Chat' : 'Historique'}
            style={{
              background: showHistory ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: 'none',
              color: showHistory ? '#818cf8' : '#8898aa',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            📋
          </button>
          <button
            type="button"
            onClick={onHide}
            aria-label="Masquer complètement Reem"
            title="Masquer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8898aa',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            👁
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            title="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8898aa',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {showHistory ? (
          <div>
            <div style={{ fontSize: '11px', color: '#8898aa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Historique — {messages.length} messages
            </div>
            {messages.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#3d4f63' }}>Aucun historique</div>
            ) : (
              <button
                type="button"
                onClick={clearHistory}
                style={{
                  background: 'rgba(244,63,94,0.08)',
                  border: '1px solid rgba(244,63,94,0.2)',
                  borderRadius: '6px',
                  color: '#f43f5e',
                  padding: '6px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Effacer tout l&apos;historique
              </button>
            )}
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <AgentMessageComponent
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  toolData={m.tool_data}
                  userName={displayName}
                  userInitials={initials}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div>
            <div
              style={{
                fontSize: '13px',
                color: '#e8edf5',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '14px',
              }}
            >
              Bonjour {displayName.split(' ')[0] || ''} 👋<br />
              <span style={{ color: '#8898aa', fontSize: '12px' }}>Comment puis-je t&apos;aider ?</span>
            </div>
            {showSuggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#8898aa',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
                      e.currentTarget.style.color = '#e8edf5'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                      e.currentTarget.style.color = '#8898aa'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map(m => (
              <AgentMessageComponent
                key={m.id}
                role={m.role}
                content={m.content}
                toolData={m.tool_data}
                userName={displayName}
                userInitials={initials}
              />
            ))}
            {sending && (
              <div style={{ fontSize: '12px', color: '#8898aa', fontStyle: 'italic' }}>Reem réfléchit…</div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {!showHistory && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <AgentInput
            onSend={handleSend}
            disabled={sending}
            value={draftMessage}
            onChange={onDraftChange}
          />
        </div>
      )}
    </div>
  )
}
