'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface RealtimeOptions {
  table: string
  event?: RealtimeEvent
  filter?: string
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
  onChange?: (payload: Record<string, unknown>) => void
}

export function useRealtime(options: RealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const { table, event = '*', filter, onInsert, onUpdate, onDelete, onChange } = options

    const channelName = `realtime:${table}:${filter ?? 'all'}`
    const channel = supabase.channel(channelName)

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event, schema: 'public', table, filter },
      (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
        onChange?.(payload as unknown as Record<string, unknown>)
        if (payload.eventType === 'INSERT') onInsert?.(payload.new)
        if (payload.eventType === 'UPDATE') onUpdate?.(payload.new)
        if (payload.eventType === 'DELETE') onDelete?.(payload.old)
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.table, options.filter])
}
