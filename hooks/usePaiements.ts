'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { Paiement } from '@/lib/types'

function normalizePaiement<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    montant: Number(row.montant) || 0,
  }
}

export function usePaiements(createdBy?: string) {
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('paiements')
        .select('*')
        .order('date', { ascending: false })

      if (createdBy) query = query.eq('created_by', createdBy)

      const { data, error: err } = await query
      if (err) throw err
      const normalized = (data ?? []).map(p => normalizePaiement(p))
      setPaiements(normalized as Paiement[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [createdBy])

  useEffect(() => { load() }, [load])

  useRealtime({
    table:    'paiements',
    onInsert: row => {
      const normalized = normalizePaiement(row) as unknown as Paiement
      setPaiements(prev => prev.some(p => p.id === normalized.id) ? prev : [normalized, ...prev])
    },
    onUpdate: row => {
      const normalized = normalizePaiement(row) as unknown as Paiement
      setPaiements(prev => prev.map(p => p.id === normalized.id ? { ...p, ...normalized } : p))
    },
    onDelete: row => setPaiements(prev => prev.filter(p => p.id !== (row as unknown as { id: string }).id)),
  })

  const add = useCallback(async (data: Omit<Paiement, 'id' | 'created_at'>) => {
    const optimisticId = crypto.randomUUID()
    const optimistic = { ...data, id: optimisticId, created_at: new Date().toISOString() }
    setPaiements(prev => [optimistic, ...prev])
    try {
      const { data: inserted, error: err } = await supabase
        .from('paiements')
        .insert(data)
        .select('*')
        .single()
      if (err) throw err
      const normalized = normalizePaiement(inserted) as Paiement
      setPaiements(prev => prev.map(p => p.id === optimisticId ? normalized : p))
      return normalized
    } catch (e) {
      setPaiements(prev => prev.filter(p => p.id !== optimisticId))
      throw e
    }
  }, [])

  return { paiements, loading, error, reload: load, add }
}
