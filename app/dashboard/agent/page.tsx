'use client'

import { useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useClientContext } from '@/hooks/useClientContext'
import { useAgentMessages } from '@/hooks/useAgentMessages'
import { avatarInitials } from '@/lib/utils'
import AgentInput from '@/components/agent/AgentInput'
import AgentMessageComponent from '@/components/agent/AgentMessage'

const QUICK_ACTIONS = [
  { emoji: '📊', label: 'Résumé du mois', message: 'Fais-moi un résumé des commissions et paiements de ce mois' },
  { emoji: '💰', label: 'Commissions en retard', message: 'Quelles commissions sont encore en statut dû ?' },
  { emoji: '📁', label: 'Chercher un fichier', message: 'Cherche dans le Drive les derniers fichiers ajoutés' },
  { emoji: '✉️', label: 'Rédiger un email', message: 'Aide-moi à rédiger un email de relance de paiement' },
]

export default function AgentPage() {
  const { user } = useAuth()
  const { selectedClientId } = useClientContext()
  const { messages, sending, sendMessage, clearHistory, confirmAction } = useAgentMessages(user?.id)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const displayName = user?.display_name ?? ''
  const firstName = displayName ? displayName.split(' ')[0] : ''
  const initials = displayName ? avatarInitials(displayName) : 'U'

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = (message: string) => {
    sendMessage(message, selectedClientId)
  }

  const handleQuickAction = (action: { emoji: string; label: string }) => {
    sendMessage(`${action.emoji} ${action.label}`, selectedClientId)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      margin: '-32px -16px',
      background: '#07080d',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#0f1117',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          color: 'white',
        }}>
          R
        </div>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#10b981',
          marginLeft: '-6px',
          marginTop: '14px',
          border: '2px solid #0f1117',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#e8edf5', margin: 0 }}>Reem AI</h1>
          <p style={{ fontSize: '11px', color: '#8898aa', marginTop: '1px' }}>
            Assistant intelligent &middot; LR Consulting
          </p>
        </div>
        <button
          onClick={clearHistory}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#8898aa',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e8edf5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8898aa' }}
        >
          Effacer l&apos;historique
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.length === 0 && !sending && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.05))',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '20px auto',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 700,
              color: 'white',
              margin: '0 auto 12px',
            }}>
              R
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e8edf5', marginBottom: '6px' }}>
              Bonjour {firstName} 👋
            </h2>
            <p style={{ fontSize: '13px', color: '#8898aa', lineHeight: 1.6 }}>
              Je suis Reem, votre assistante IA. Je peux interroger vos donnees, creer des commissions, chercher dans votre Drive, rediger des emails et discuter de tout sujet.
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
              marginTop: '16px',
            }}>
              {QUICK_ACTIONS.map(qa => (
                <button
                  key={qa.label}
                  onClick={() => handleQuickAction(qa)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#e8edf5',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.1)'
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
                    e.currentTarget.style.color = '#818cf8'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = '#e8edf5'
                  }}
                >
                  {qa.emoji} {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <AgentMessageComponent
            key={msg.id}
            role={msg.role}
            content={msg.content}
            toolData={msg.tool_data}
            userName={user?.display_name}
            userInitials={initials}
            onConfirm={confirmAction}
          />
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              R
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block',
                      animation: `agentBounce 1.2s infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: '11px', color: '#3d4f63', fontStyle: 'italic' }}>
                Reem reflechit...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <AgentInput onSend={handleSend} disabled={sending} />

      {/* Bounce animation */}
      <style>{`
        @keyframes agentBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
