'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMessages } from '@/hooks/useMessages'
import { useTyping } from '@/hooks/useTyping'
import { useAuth } from '@/hooks/useAuth'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import type { Channel } from '@/lib/types'

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

  const handleSend = useCallback((content: string) => {
    if (!user) return
    sendMessage(user.id, content)
  }, [user, sendMessage])

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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#06050e' }}>
        <p style={{ color: '#4a4466', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Sélectionne un canal</p>
      </div>
    )
  }

  let lastDate = ''

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#06050e', minWidth: 0, position: 'relative' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(99,102,241,0.1)', backgroundColor: '#0e0d1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#a78bfa', fontSize: '18px', fontWeight: 300 }}>#</span>
          <div>
            <p style={{ color: '#f0eef8', fontSize: '13px', fontWeight: 500, fontFamily: 'Space Grotesk, sans-serif', margin: 0 }}>{channel.name}</p>
            <p style={{ color: '#8b85a8', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>
              {channel.type === 'general' ? 'Canal général' : 'Canal client'}
            </p>
          </div>
        </div>
        {/* Stacked avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 500, color: '#a78bfa', border: '1.5px solid #0e0d1a', zIndex: 2 }}>A</div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 500, color: '#38bdf8', border: '1.5px solid #0e0d1a', marginLeft: '-6px', zIndex: 1 }}>L</div>
          <span style={{ color: '#8b85a8', fontSize: '10px', marginLeft: '4px' }}>2</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#06050e', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}
      >
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <p style={{ color: '#4a4466', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>Aucun message · Envoyez le premier !</p>
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
                  <div style={{ flex: 1, height: '0.5px', backgroundColor: 'rgba(99,102,241,0.1)' }} />
                  <span style={{ color: '#4a4466', fontSize: '9px', padding: '0 8px', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
                    {formatDateSeparator(msg.created_at)}
                  </span>
                  <div style={{ flex: 1, height: '0.5px', backgroundColor: 'rgba(99,102,241,0.1)' }} />
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
                width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#8b85a8', display: 'inline-block',
                animation: `typingBounce 1.2s infinite ${i * 0.2}s`,
              }}
            />
          ))}
          <span style={{ color: '#4a4466', fontSize: '10px', fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif' }}>
            {typingUsers.map(u => u.displayName).join(', ')} écrit...
          </span>
        </div>
      )}

      {/* Drag & drop zone */}
      {dragOver && (
        <div style={{ margin: '0 12px 5px', border: '1.5px dashed rgba(139,92,246,0.4)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#4a4466', fontSize: '10px', fontFamily: 'DM Sans, sans-serif', backgroundColor: 'rgba(139,92,246,0.04)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Glisse un fichier ici · Drive ou local
        </div>
      )}

      {/* Upload indicator */}
      {uploading && (
        <div style={{ padding: '2px 16px 4px' }}>
          <p style={{ fontSize: '10px', color: '#8b85a8', fontFamily: 'DM Sans, sans-serif' }}>Upload en cours...</p>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} onTyping={setTyping} onFileUpload={handleFileUpload} disabled={uploading} />

      <style jsx>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
