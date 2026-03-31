'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCommissions } from '@/hooks/useCommissions'
import { usePaiements } from '@/hooks/usePaiements'
import { supabase } from '@/lib/supabase'

import Header from '@/components/layout/Header'
import KpiGrid from '@/components/dashboard/KpiGrid'
import RepartitionChart from '@/components/dashboard/RepartitionChart'
import CaCommissionChart from '@/components/dashboard/CaCommissionChart'
import PaiementTracker from '@/components/dashboard/PaiementTracker'
import CommissionTable from '@/components/dashboard/CommissionTable'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import SeedButton from '@/components/dashboard/SeedButton'

import type { User, Prime, Commission } from '@/lib/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [associe, setAssociate] = useState<User | null>(null)
  const [primes, setPrimes]     = useState<Prime[]>([])

  const loadAssociate = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'associe')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (data) setAssociate(data)
  }, [])

  useEffect(() => {
    loadAssociate()
    supabase.from('primes').select('*').eq('active', true).then(({ data }) => {
      if (data) setPrimes(data)
    })
  }, [loadAssociate])

  // Realtime rename
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-users')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'users' }, (payload: { new: User }) => {
        if (payload.new.role === 'associe') setAssociate(payload.new)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const associeId = associe?.id

  const { commissions, add: addCommission, update: updateCommission, remove: removeCommission, reload: reloadCommissions } = useCommissions(associeId)
  const { paiements, add: addPaiement, reload: reloadPaiements } = usePaiements(associeId)

  const commissionsTotal = commissions.reduce((s, c) => s + Number(c.commission), 0)
  const isAssociate      = user?.role === 'associe'
  const isAdmin          = user?.role === 'admin'

  async function logActivity(action: string, entityType: string, entityId: string, description: string) {
    await supabase.from('activity_log').insert({
      user_id:     user!.id,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      details:     { description },
    })
  }

  async function handleAddCommission(data: Omit<Commission, 'id' | 'created_at' | 'updated_at'>) {
    const inserted = await addCommission(data)
    const prime = primes.find(p => p.id === data.prime_id)
    await logActivity('create', 'commission', inserted.id,
      `${user!.display_name} a ajouté une commission ${prime?.name ?? data.prime_id} de ${new Intl.NumberFormat('fr-FR').format(data.ca)} €`)
  }

  async function handleUpdateCommission(id: string, data: Partial<Commission>) {
    await updateCommission(id, data)
    await logActivity('update', 'commission', id, `${user!.display_name} a modifié une commission`)
  }

  async function handleDeleteCommission(id: string) {
    await removeCommission(id)
    await logActivity('delete', 'commission', id, `${user!.display_name} a supprimé une commission`)
  }

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

  if (!user) return null

  return (
    <>
      <Header
        associe={associe}
        primesCount={primes.filter(p => p.active).length}
        onRenameAssociate={handleRenameAssociate}
        onMobileMenuOpen={() => {}}
      />

      {/* Bouton seed — associé uniquement, vérifie lui-même si la table est vide */}
      {isAssociate && (
        <SeedButton
          userId={user.id}
          onImported={() => { reloadCommissions(); reloadPaiements() }}
        />
      )}

      {/* KPIs */}
      <KpiGrid commissions={commissions} paiements={paiements} />

      {/* Graphiques */}
      <section id="graphiques" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 animate-fadeIn">
        <RepartitionChart commissions={commissions} primes={primes} />
        <CaCommissionChart commissions={commissions} primes={primes} />
      </section>

      {/* Paiements */}
      <PaiementTracker
        paiements={paiements}
        commissionsTotal={commissionsTotal}
        userId={user.id}
        isAssociate={isAssociate}
        onAdd={async (data) => {
          await addPaiement(data)
          await logActivity('create', 'paiement', data.created_by,
            `${user.display_name} a ajouté un paiement de ${new Intl.NumberFormat('fr-FR').format(data.montant)} €`)
        }}
      />

      {/* Commissions */}
      <CommissionTable
        commissions={commissions}
        primes={primes}
        userId={user.id}
        isAssociate={isAssociate}
        isAdmin={isAdmin}
        onAdd={handleAddCommission}
        onUpdate={handleUpdateCommission}
        onDelete={handleDeleteCommission}
      />

      {/* Activité */}
      <ActivityFeed />
    </>
  )
}
