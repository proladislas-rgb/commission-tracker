'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as AgentMessage[])
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const sendMessage = useCallback(async (message: string, clientId: string | null) => {
    if (!userId) return
    setSending(true)

    // Optimistic user message
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
        body: JSON.stringify({ message, userId, clientId }),
      })
      await load()
    } catch {
      // Remove optimistic on error
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }, [userId, load])

  const clearHistory = useCallback(async () => {
    if (!userId) return
    try {
      await fetch('/api/agent/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setMessages([])
    } catch {
      // silencieux
    }
  }, [userId])

  const confirmAction = useCallback(async (action: string, data: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch('/api/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data, userId }),
      })
      if (!res.ok) return false
      const json = await res.json() as { success: boolean }
      if (json.success) await load()
      return json.success
    } catch {
      return false
    }
  }, [userId, load])

  return { messages, loading, sending, sendMessage, clearHistory, confirmAction, reload: load }
}
