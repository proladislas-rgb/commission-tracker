'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime, avatarInitials } from '@/lib/utils'
import type { ActivityLog, User } from '@/lib/types'

export default function ActivityFeed() {
  const [logs, setLogs]         = useState<(ActivityLog & { user?: User })[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('activity_log')
        .select('*, user:users(id, display_name, avatar_color)')
        .order('created_at', { ascending: false })
        .limit(20)
      setLogs(data ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('activity-feed')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'activity_log' }, async (payload: { new: Record<string, unknown> }) => {
        // Récupérer le user du nouveau log
        const { data: logWithUser } = await supabase
          .from('activity_log')
          .select('*, user:users(id, display_name, avatar_color)')
          .eq('id', (payload.new as { id: string }).id)
          .single()
        if (logWithUser) {
          setLogs(prev => [logWithUser, ...prev].slice(0, 20))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <section id="activite" className="mb-8">
        <h2 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mb-4">Activité récente</h2>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-card skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section id="activite" className="mb-8 animate-fadeIn">
      <h2 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mb-4">Activité récente</h2>
      {logs.length === 0 ? (
        <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-6 text-center text-sm text-txt3">
          Aucune activité
        </div>
      ) : (
        <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card overflow-hidden shadow-card">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[rgba(255,255,255,0.04)]' : ''} hover:bg-[rgba(255,255,255,0.02)] transition-colors`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ backgroundColor: log.user?.avatar_color ?? '#6366f1' }}
              >
                {log.user ? avatarInitials(log.user.display_name) : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-txt leading-snug">{log.details?.description}</p>
                <p className="text-[11px] text-txt3 mt-0.5">{formatRelativeTime(log.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
