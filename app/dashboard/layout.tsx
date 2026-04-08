'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/layout/AppShell'
import { ClientProvider } from '@/hooks/useClientContext'
import ReemWidget from '@/components/reem/ReemWidget'
import { ReemUIProvider } from '@/components/reem/ReemUIProvider'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/hooks/useRealtime'
import type { User } from '@/lib/types'

interface DashboardAssociateContextValue {
  associe: User | null
  handleRenameAssociate: (newName: string) => Promise<void>
}

const DashboardAssociateContext = createContext<DashboardAssociateContextValue | null>(null)

export function useDashboardAssociate(): DashboardAssociateContextValue {
  const ctx = useContext(DashboardAssociateContext)
  if (!ctx) throw new Error('useDashboardAssociate must be used within DashboardLayout')
  return ctx
}

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

  // Realtime rename — migré vers useRealtime (I21)
  useRealtime({
    table: 'users',
    event: 'UPDATE',
    onUpdate: (payload) => {
      const updated = payload as unknown as User
      if (updated.role === 'associe') setAssociate(updated)
    },
  })

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
    <DashboardAssociateContext.Provider value={{ associe, handleRenameAssociate }}>
      <ClientProvider>
        <ReemUIProvider>
          <AppShell associe={associe} onRenameAssociate={handleRenameAssociate}>
            {children}
          </AppShell>
          <ReemWidget />
        </ReemUIProvider>
      </ClientProvider>
    </DashboardAssociateContext.Provider>
  )
}
