'use client'

import { useState } from 'react'
import type { Message, User } from '@/lib/types'

const QUICK_EMOJIS = ['👍', '🎉', '👀', '✅', '🔥']

const FILE_ICON_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  'application/pdf': { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'DOCX' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'XLSX' },
}

function getFileStyle(mimeType: string | null): { bg: string; color: string; label: string } {
  if (!mimeType) return { bg: 'rgba(139,92,246,0.15)', color: '#8b85a8', label: 'FILE' }
  if (FILE_ICON_STYLES[mimeType]) return FILE_ICON_STYLES[mimeType]
  if (mimeType.startsWith('image/')) return { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: 'IMG' }
  return { bg: 'rgba(139,92,246,0.15)', color: '#8b85a8', label: 'FILE' }
}

function formatFileSize(bytes: string | null): string {
  if (!bytes) return ''
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

interface ChatMessageProps {
  message: Message
  isOwn: boolean
  currentUserId: string
  onReaction: (messageId: string, emoji: string) => void
  showAvatar: boolean
}

export default function ChatMessage({ message, isOwn, currentUserId, onReaction, showAvatar }: ChatMessageProps) {
  const [showPicker, setShowPicker] = useState(false)
  const user = message.user as User | undefined
  const displayName = user?.display_name ?? '??'
  const initial = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const isAdmin = user?.role === 'admin'
  const avatarBg = isAdmin ? 'rgba(139,92,246,0.25)' : 'rgba(56,189,248,0.25)'
  const avatarColor = isAdmin ? '#a78bfa' : '#38bdf8'
  const nameColor = isAdmin ? '#a78bfa' : '#38bdf8'

  const isFile = !!message.file_url
  const fileStyle = getFileStyle(message.file_type)
  const reactions = message.reactions ?? {}
  const hasReactions = Object.keys(reactions).length > 0

  return (
    <div
      className="relative group"
      style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: isOwn ? 'row-reverse' : 'row' }}
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0, backgroundColor: avatarBg, color: avatarColor }}>
          {initial}
        </div>
      ) : (
        <div style={{ width: '28px', flexShrink: 0 }} />
      )}

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
        {/* Name */}
        {showAvatar && (
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', fontWeight: 500, color: nameColor, marginBottom: '2px' }}>
            {displayName}
          </span>
        )}

        {/* Bubble */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              backgroundColor: isOwn ? (isFile ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.15)') : '#16142a',
              border: `0.5px solid ${isOwn ? 'rgba(139,92,246,0.25)' : (isFile ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.12)')}`,
              borderRadius: '10px',
              padding: isFile ? '8px 10px' : '8px 12px',
            }}
            onMouseEnter={e => { if (isFile) e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)' }}
            onMouseLeave={e => { if (isFile) e.currentTarget.style.borderColor = isOwn ? 'rgba(139,92,246,0.2)' : 'rgba(99,102,241,0.15)' }}
          >
            {isFile ? (
              <a
                href={message.file_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer' }}
              >
                <div style={{ borderRadius: '6px', padding: '3px 6px', fontSize: '9px', fontWeight: 700, backgroundColor: fileStyle.bg, color: fileStyle.color }}>
                  {fileStyle.label}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#f0eef8', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px', margin: 0 }}>{message.file_name}</p>
                  <p style={{ color: '#8b85a8', fontSize: '9px', margin: 0 }}>{formatFileSize(message.file_size)}</p>
                </div>
              </a>
            ) : (
              <p style={{ color: '#f0eef8', fontSize: '13px', lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif', margin: 0, wordBreak: 'break-word' }}>
                {message.content}
              </p>
            )}
          </div>

          {/* Reaction toolbar on hover */}
          {showPicker && (
            <div style={{
              position: 'absolute',
              top: '-18px',
              right: isOwn ? undefined : '0',
              left: isOwn ? '0' : undefined,
              backgroundColor: '#16142a',
              border: '0.5px solid rgba(99,102,241,0.15)',
              borderRadius: '8px',
              padding: '4px 8px',
              display: 'flex',
              gap: '6px',
              zIndex: 10,
            }}>
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  style={{ fontSize: '16px', cursor: 'pointer', background: 'none', border: 'none', padding: 0, lineHeight: 1 }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {hasReactions && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
            {Object.entries(reactions).map(([emoji, userIds]) => {
              const isActive = userIds.includes(currentUserId)
              return (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    backgroundColor: isActive ? 'rgba(139,92,246,0.18)' : 'rgba(99,102,241,0.08)',
                    border: `0.5px solid ${isActive ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.15)'}`,
                    borderRadius: '20px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = isActive ? 'rgba(139,92,246,0.25)' : 'rgba(99,102,241,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = isActive ? 'rgba(139,92,246,0.18)' : 'rgba(99,102,241,0.08)' }}
                >
                  <span style={{ fontSize: '15px', lineHeight: 1 }}>{emoji}</span>
                  <span style={{ fontSize: '11px', color: isActive ? '#a78bfa' : '#8b85a8', marginLeft: '2px' }}>{userIds.length}</span>
                </button>
              )
            })}
            <button
              onClick={() => setShowPicker(true)}
              style={{
                background: 'transparent',
                border: '0.5px dashed rgba(99,102,241,0.2)',
                borderRadius: '20px',
                padding: '3px 8px',
                fontSize: '12px',
                color: '#4a4466',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'; e.currentTarget.style.color = '#8b85a8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.color = '#4a4466' }}
            >
              +
            </button>
          </div>
        )}

        {/* Timestamp */}
        <span style={{ color: '#4a4466', fontSize: '9px', marginTop: '3px', textAlign: 'right', fontFamily: 'DM Sans, sans-serif' }}>
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
