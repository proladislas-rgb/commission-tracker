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

  // C4: Unique ID per hook instance to avoid channel name collisions
  const instanceIdRef = useRef<string | null>(null)
  if (instanceIdRef.current === null) {
    instanceIdRef.current = crypto.randomUUID()
  }

  // C5: Latest-ref pattern — keep callbacks fresh without re-subscribing
  const onInsertRef = useRef(options.onInsert)
  const onUpdateRef = useRef(options.onUpdate)
  const onDeleteRef = useRef(options.onDelete)
  const onChangeRef = useRef(options.onChange)

  useEffect(() => {
    onInsertRef.current = options.onInsert
    onUpdateRef.current = options.onUpdate
    onDeleteRef.current = options.onDelete
    onChangeRef.current = options.onChange
  })

  useEffect(() => {
    const { table, event = '*', filter } = options

    const channelName = `realtime:${table}:${filter ?? 'all'}:${instanceIdRef.current}`
    const channel = supabase.channel(channelName)

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      { event, schema: 'public', table, filter },
      (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
        onChangeRef.current?.(payload as unknown as Record<string, unknown>)
        if (payload.eventType === 'INSERT') onInsertRef.current?.(payload.new)
        else if (payload.eventType === 'UPDATE') onUpdateRef.current?.(payload.new)
        else if (payload.eventType === 'DELETE') onDeleteRef.current?.(payload.old)
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
