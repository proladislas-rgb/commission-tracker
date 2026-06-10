'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useChannels } from '@/hooks/useChannels'
import { useAuth } from '@/hooks/useAuth'
import { fetchUnreadCounts } from '@/lib/chat-unread'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatWindow from '@/components/chat/ChatWindow'

export default function ChatPage() {
  const { channels, loading, error: channelsError, reload: reloadChannels } = useChannels()
  const { user } = useAuth()
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    const userId = user?.id
    if (!userId || channels.length === 0) return

    async function fetchUnread() {
      const channelIds = channels.map(ch => ch.id)
      const counts = await fetchUnreadCounts(userId!, channelIds)
      if (!isMountedRef.current) return
      setUnreadCounts(counts)
    }

    fetchUnread()
  }, [user?.id, channels])

  // Derive active channel
  const activeChannelId = useMemo(() => {
    if (userSelectedId && channels.some(c => c.id === userSelectedId)) return userSelectedId
    const general = channels.find(c => c.type === 'general')
    if (general) return general.id
    if (channels.length > 0) return channels[0].id
    return null
  }, [userSelectedId, channels])

  const handleSelect = useCallback((channelId: string) => {
    setUserSelectedId(channelId)
    const now = new Date().toISOString()
    localStorage.setItem(`chat_read_${channelId}`, now)
    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }))
  }, [])

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', backgroundColor: 'transparent' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (channelsError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: '100vh', backgroundColor: 'transparent' }}>
        <p style={{ color: '#ff8589', fontSize: '13px' }}>{channelsError}</p>
        <button
          onClick={reloadChannels}
          style={{ padding: '6px 14px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(30,30,38,0.92)', color: '#f5f5f8', fontSize: '12px', cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh', backgroundColor: 'transparent' }}>
      <ChatSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelect={handleSelect}
        unreadCounts={unreadCounts}
      />
      <ChatWindow channel={activeChannel} />
    </div>
  )
}
