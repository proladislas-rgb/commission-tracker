'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useChannels } from '@/hooks/useChannels'
import { useAuth } from '@/hooks/useAuth'
import { fetchUnreadCounts } from '@/lib/chat-unread'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatWindow from '@/components/chat/ChatWindow'

export default function ChatPage() {
  const { channels, loading } = useChannels()
  const { user } = useAuth()
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const userId = user?.id
    if (!userId || channels.length === 0) return

    async function fetchUnread() {
      const channelIds = channels.map(ch => ch.id)
      const counts = await fetchUnreadCounts(userId!, channelIds)
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
      <div className="flex items-center justify-center" style={{ height: '100vh', margin: '-32px -16px', backgroundColor: '#07080d' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh', margin: '-32px -16px', backgroundColor: '#07080d' }}>
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
