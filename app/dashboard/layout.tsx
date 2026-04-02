'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/layout/AppShell'
import { ClientProvider } from '@/hooks/useClientContext'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [associe, setAssociate] = useState<User | null>(null)

  const loadAssociate = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'associe')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (data) setAssociate(data)
    } catch {
      // pas d'associé trouvé
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data from Supabase
    loadAssociate()
  }, [loadAssociate])

  // Realtime rename
  useEffect(() => {
    const channel = supabase
      .channel('users-rename')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'users' }, (payload: { new: User }) => {
        if (payload.new.role === 'associe') setAssociate(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleRenameAssociate(newName: string) {
    if (!associe) return
    const res = await fetch(`/api/users/${associe.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: newName }),
    })
    if (!res.ok) throw new Error('Erreur lors du renommage')
    const updated = await res.json()
    setAssociate(updated)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <ClientProvider>
      <AppShell associe={associe} onRenameAssociate={handleRenameAssociate}>
        {children}
      </AppShell>
    </ClientProvider>
  )
}
