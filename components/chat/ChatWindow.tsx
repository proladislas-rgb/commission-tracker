'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMessages } from '@/hooks/useMessages'
import { useTyping } from '@/hooks/useTyping'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import type { Channel, User } from '@/lib/types'

interface ChatWindowProps {
  channel: Channel | null
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return 'Hier'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

export default function ChatWindow({ channel }: ChatWindowProps) {
  const { user } = useAuth()
  const { messages, loading, sendMessage, addReaction } = useMessages(channel?.id ?? null)
  const { typingUsers, setTyping } = useTyping(channel?.id ?? null, user?.id ?? null, user?.display_name ?? null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [chatUsers, setChatUsers] = useState<User[]>([])

  // Load users for mentions
  useEffect(() => {
    supabase.from('users').select('id, display_name, role, avatar_color').then(({ data }) => {
      if (data) setChatUsers(data as User[])
    })
  }, [])

  // Mark channel as read
  useEffect(() => {
    if (channel?.id && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      localStorage.setItem(`chat_read_${channel.id}`, lastMsg.created_at)
    }
  }, [channel?.id, messages])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async (content: string) => {
    if (!user) return
    sendMessage(user.id, content)

    // Check for @mentions and send notification emails
    const mentionMatches = content.match(/@(\S+)/g)
    if (mentionMatches && channel) {
      const mentionedNames = mentionMatches.map(m => m.slice(1).toLowerCase())
      const mentionedUsers = chatUsers.filter(u =>
        mentionedNames.some(name => u.display_name.toLowerCase().startsWith(name)) && u.id !== user.id
      )
      for (const mentioned of mentionedUsers) {
        try {
          await fetch('/api/chat/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'mention',
              mentionedUserId: mentioned.id,
              senderName: user.display_name,
              channelName: channel.name,
              messagePreview: content.slice(0, 200),
            }),
          })
        } catch {
          // notification silencieuse
        }
      }
    }
  }, [user, sendMessage, chatUsers, channel])

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!user) return
    addReaction(messageId, emoji, user.id)
  }, [user, addReaction])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!user || !channel) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('channelId', channel.id)
      formData.append('userId', user.id)
      const res = await fetch('/api/chat/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Échec upload')
    } catch {
      // silencieux
    } finally {
      setUploading(false)
    }
  }, [user, channel])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  if (!channel) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#07080d' }}>
        <p style={{ color: '#3d4f63', fontSize: '13px' }}>Sélectionne un canal</p>
      </div>
    )
  }

  let lastDate = ''

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#07080d', minWidth: 0, position: 'relative' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', backgroundColor: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#818cf8', fontSize: '18px', fontWeight: 300 }}>#</span>
          <div>
            <p style={{ color: '#e8edf5', fontSize: '13px', fontWeight: 500, margin: 0 }}>{channel.name}</p>
            <p style={{ color: '#8898aa', fontSize: '10px', margin: 0 }}>
              {channel.type === 'general' ? 'Canal général' : 'Canal client'}
            </p>
          </div>
        </div>
        {/* Stacked avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 500, color: '#818cf8', border: '1.5px solid #0f1117', zIndex: 2 }}>A</div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 500, color: '#38bdf8', border: '1.5px solid #0f1117', marginLeft: '-6px', zIndex: 1 }}>L</div>
          <span style={{ color: '#8898aa', fontSize: '10px', marginLeft: '4px' }}>2</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#07080d', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.18) transparent' }}
      >
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <p style={{ color: '#3d4f63', fontSize: '12px' }}>Aucun message · Envoyez le premier !</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const msgDate = new Date(msg.created_at).toDateString()
          const showSeparator = msgDate !== lastDate
          lastDate = msgDate

          const prevMsg = messages[i - 1]
          const showAvatar = !prevMsg || String(prevMsg.user_id) !== String(msg.user_id) || showSeparator

          return (
            <div key={msg.id}>
              {showSeparator && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                  <div style={{ flex: 1, height: '0.5px', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ color: '#3d4f63', fontSize: '9px', padding: '0 8px', flexShrink: 0 }}>
                    {formatDateSeparator(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: '0.5px', backgroundColor: 'rgba(255,255,255,0.07)' }} />
                </div>
              )}
              <ChatMessage
                message={msg}
                isOwn={String(msg.user_id) === String(user?.id)}
                currentUserId={user?.id ?? ''}
                onReaction={handleReaction}
                showAvatar={showAvatar}
              />
            </div>
          )
        })}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div style={{ padding: '3px 16px 5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#8898aa', display: 'inline-block',
                animation: `typingBounce 1.2s infinite ${i * 0.2}s`,
              }}
            />
          ))}
          <span style={{ color: '#3d4f63', fontSize: '10px', fontStyle: 'italic' }}>
            {typingUsers.map(u => u.displayName).join(', ')} écrit...
          </span>
        </div>
      )}

      {/* Drag & drop overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(7,8,13,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed rgba(99,102,241,0.5)', borderRadius: '12px',
          pointerEvents: 'none',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ color: '#6366f1', fontSize: '14px', fontWeight: 500, marginTop: '12px' }}>
            Déposer le fichier ici
          </p>
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div style={{ padding: '2px 16px 4px' }}>
          <p style={{ fontSize: '10px', color: '#8898aa' }}>Upload en cours...</p>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTyping={setTyping}
        onFileUpload={handleFileUpload}
        disabled={uploading}
        users={chatUsers.map(u => ({ id: u.id, display_name: u.display_name }))}
      />

      <style jsx>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
