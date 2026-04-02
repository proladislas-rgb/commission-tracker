'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { Channel } from '@/lib/types'

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setChannels((data ?? []) as Channel[])
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime({
    table: 'channels',
    onInsert: row => {
      const channel = row as unknown as Channel
      setChannels(prev =>
        prev.some(c => c.id === channel.id)
          ? prev
          : [...prev, channel].sort((a, b) => {
              if (a.type !== b.type) return a.type === 'general' ? -1 : 1
              return a.name.localeCompare(b.name)
            })
      )
    },
    onDelete: row => {
      setChannels(prev => prev.filter(c => c.id !== (row as unknown as { id: string }).id))
    },
  })

  return { channels, loading }
}
