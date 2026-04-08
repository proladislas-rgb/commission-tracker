'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface TypingUser {
  userId: string
  displayName: string
}

export function useTyping(channelId: string | null, currentUserId: string | null, currentDisplayName: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!channelId || !currentUserId) return

    const channel = supabase.channel(`typing:${channelId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ userId: string; displayName: string }>()
        const users: TypingUser[] = []
        for (const [key, presences] of Object.entries(state)) {
          if (key !== currentUserId && presences.length > 0) {
            users.push({ userId: presences[0].userId, displayName: presences[0].displayName })
          }
        }
        setTypingUsers(users)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [channelId, currentUserId])

  const setTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId || !currentDisplayName) return

    channelRef.current.track({
      userId: currentUserId,
      displayName: currentDisplayName,
    })

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      channelRef.current?.untrack()
    }, 3000)
  }, [currentUserId, currentDisplayName])

  return { typingUsers, setTyping }
}
