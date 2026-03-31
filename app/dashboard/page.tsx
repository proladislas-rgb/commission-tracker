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

import type { User, Prime, Commission, CommissionStatus } from '@/lib/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [associe, setAssociate] = useState<User | null>(null)
  const [primes, setPrimes]     = useState<Prime[]>([])

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

  const loadPrimes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('primes').select('*')
      if (error) throw error
      setPrimes(data ?? [])
    } catch {
      // erreur silencieuse, garde le state actuel
    }
  }, [])

  useEffect(() => {
    loadAssociate()
    loadPrimes()
  }, [loadAssociate, loadPrimes])

  // Realtime: users
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

  // Realtime: primes — refetch complet pour garder la cohérence
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-primes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'primes' }, () => {
        loadPrimes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadPrimes])

  // Garde-fou de cohérence : vérification toutes les 10s
  const associeId = associe?.id

  const { commissions, add: addCommission, update: updateCommission, remove: removeCommission, reload: reloadCommissions } = useCommissions(associeId)
  const { paiements, add: addPaiement, reload: reloadPaiements } = usePaiements(associeId)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { count: primesCount } = await supabase
          .from('primes')
          .select('*', { count: 'exact', head: true })
        if (primesCount !== null && primesCount !== primes.length) {
          console.warn('INCOHÉRENCE DÉTECTÉE: primes DB=' + primesCount + ' state=' + primes.length)
          loadPrimes()
        }
      } catch {
        // silencieux
      }
    }, 10_000)
    return () => clearInterval(interval)
  }, [primes.length, loadPrimes])

  const commissionsTotal = commissions.reduce((s, c) => s + Number(c.commission), 0)
  const isAssociate      = user?.role === 'associe'
  const isAdmin          = user?.role === 'admin'

  async function logActivity(action: string, entityType: string, entityId: string, description: string) {
    try {
      await supabase.from('activity_log').insert({
        user_id:     user!.id,
        action,
        entity_type: entityType,
        entity_id:   entityId,
        details:     { description },
      })
    } catch {
      // log silencieux
    }
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
    const commission = commissions.find(c => c.id === id)
    const prime = commission ? primes.find(p => p.id === commission.prime_id) : null
    await removeCommission(id)
    await logActivity('delete', 'commission', id,
      `${user!.display_name} a supprimé une commission ${prime?.name ?? ''} de ${commission ? new Intl.NumberFormat('fr-FR').format(Number(commission.ca)) : '?'} €`)
  }

  async function handleCreatePrime(data: { name: string; color: string; icon: string }): Promise<Prime> {
    // Vérification doublon
    const existing = primes.find(p => p.name.toLowerCase() === data.name.trim().toLowerCase())
    if (existing) throw new Error('Cette prime existe déjà')

    const { data: newPrime, error } = await supabase
      .from('primes')
      .insert({ name: data.name, color: data.color, icon: data.icon, active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setPrimes(prev => [...prev, newPrime])
    await logActivity('create', 'prime', newPrime.id,
      `${user!.display_name} a créé la prime ${data.icon} ${data.name}`)
    return newPrime
  }

  async function handleCreatePrimeWithCommission(primeData: { name: string; color: string; icon: string }, commissionData: { mois: string; dossiers: number; ca: number; commission: number; status: CommissionStatus }) {
    // Vérification doublon
    const existing = primes.find(p => p.name.toLowerCase() === primeData.name.trim().toLowerCase())
    if (existing) throw new Error('Cette prime existe déjà')

    // 1. Créer la prime
    const { data: newPrime, error: primeError } = await supabase
      .from('primes')
      .insert({ name: primeData.name, color: primeData.color, icon: primeData.icon, active: true })
      .select()
      .single()
    if (primeError) throw new Error(primeError.message)
    setPrimes(prev => [...prev, newPrime])

    // 2. Créer la commission associée
    const commPayload = {
      prime_id:   newPrime.id,
      ca:         commissionData.ca,
      commission: commissionData.commission,
      dossiers:   commissionData.dossiers,
      mois:       commissionData.mois,
      status:     commissionData.status,
      notes:      null,
      user_id:    associeId ?? user!.id,
      created_by: user!.id,
    }
    await addCommission(commPayload)

    // 3. Log
    await logActivity('create', 'prime', newPrime.id,
      `${user!.display_name} a créé la prime ${primeData.icon} ${primeData.name} avec une commission de ${new Intl.NumberFormat('fr-FR').format(commissionData.ca)} €`)
  }

  async function handleDeletePrime(primeId: string) {
    const prime = primes.find(p => p.id === primeId)
    const { error } = await supabase.from('primes').delete().eq('id', primeId)
    if (error) throw new Error(error.message)
    setPrimes(prev => prev.filter(p => p.id !== primeId))
    reloadCommissions()
    await logActivity('delete', 'prime', primeId,
      `${user!.display_name} a supprimé la prime ${prime?.icon ?? ''} ${prime?.name ?? ''} et ses commissions associées`)
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
        primesCount={primes.length}
        onRenameAssociate={handleRenameAssociate}
        onMobileMenuOpen={() => {}}
      />

      {isAssociate && (
        <SeedButton
          userId={user.id}
          onImported={() => { reloadCommissions(); reloadPaiements(); loadPrimes() }}
        />
      )}

      <KpiGrid commissions={commissions} paiements={paiements} />

      <section id="graphiques" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8 animate-fadeIn">
        <RepartitionChart commissions={commissions} primes={primes} />
        <CaCommissionChart commissions={commissions} primes={primes} />
      </section>

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

      <CommissionTable
        commissions={commissions}
        primes={primes}
        userId={user.id}
        isAssociate={isAssociate}
        isAdmin={isAdmin}
        onAdd={handleAddCommission}
        onUpdate={handleUpdateCommission}
        onDelete={handleDeleteCommission}
        onCreatePrime={handleCreatePrime}
        onDeletePrime={handleDeletePrime}
        onCreatePrimeWithCommission={handleCreatePrimeWithCommission}
      />

      <ActivityFeed />
    </>
  )
}
