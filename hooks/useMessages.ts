'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const realtimeRef = useRef<RealtimeChannel | null>(null)

  const load = useCallback(async () => {
    if (!channelId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, user:users(id, display_name, avatar_color, role)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error
      setMessages((data ?? []) as Message[])
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [channelId])

  useEffect(() => {
    setMessages([])
    load()
  }, [load])

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return

    const channel = supabase.channel(`messages:${channelId}`)

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      async (payload: { new: Record<string, unknown> }) => {
        const newMsg = payload.new as unknown as Message
        // Fetch with user join
        try {
          const { data } = await supabase
            .from('messages')
            .select('*, user:users(id, display_name, avatar_color, role)')
            .eq('id', newMsg.id)
            .single()
          if (data) {
            setMessages(prev => prev.some(m => m.id === (data as Message).id) ? prev : [...prev, data as Message])
          }
        } catch {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        }
      }
    )

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      (payload: { new: Record<string, unknown> }) => {
        const updated = payload.new as unknown as Message
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, reactions: updated.reactions } : m))
      }
    )

    channel.subscribe()
    realtimeRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId])

  const sendMessage = useCallback(async (userId: string, content: string) => {
    if (!channelId || !content.trim()) return
    try {
      await supabase.from('messages').insert({
        channel_id: channelId,
        user_id: userId,
        content: content.trim(),
      })
    } catch {
      // silencieux
    }
  }, [channelId])

  const addReaction = useCallback(async (messageId: string, emoji: string, userId: string) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return

    const reactions = { ...msg.reactions }
    const users = reactions[emoji] ?? []

    if (users.includes(userId)) {
      reactions[emoji] = users.filter(id => id !== userId)
      if (reactions[emoji].length === 0) delete reactions[emoji]
    } else {
      reactions[emoji] = [...users, userId]
    }

    // Optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m))

    try {
      await supabase.from('messages').update({ reactions }).eq('id', messageId)
    } catch {
      // revert
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: msg.reactions } : m))
    }
  }, [messages])

  return { messages, loading, sendMessage, addReaction }
}
