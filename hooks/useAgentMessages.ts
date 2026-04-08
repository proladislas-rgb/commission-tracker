'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReemContext } from '@/lib/reem-types'

export interface AgentMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string | null
  tool_data: { type: string; result: unknown }[] | null
  created_at: string
}

export function useAgentMessages(userId: string | undefined) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  // Version counter to discard stale loads from concurrent sends
  const loadVersionRef = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const version = ++loadVersionRef.current
    setLoading(true)
    try {
      const { data } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      // Only apply if this is still the latest load
      if (version === loadVersionRef.current) {
        setMessages((data ?? []) as AgentMessage[])
      }
    } catch {
      // silencieux
    } finally {
      if (version === loadVersionRef.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const sendMessage = useCallback(async (message: string, context: ReemContext) => {
    if (!userId) return
    setSending(true)

    const optimistic: AgentMessage = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      role: 'user',
      content: message,
      tool_data: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      })
      await load()
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }, [userId, load])

  const clearHistory = useCallback(async () => {
    if (!userId) return
    try {
      await fetch('/api/agent/clear', { method: 'DELETE' })
      setMessages([])
    } catch {
      // silencieux
    }
  }, [userId])

  return { messages, loading, sending, sendMessage, clearHistory, reload: load }
}
