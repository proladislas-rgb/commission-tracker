'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { Commission } from '@/lib/types'

function normalizeCommission<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    ca: Number(row.ca) || 0,
    commission: Number(row.commission) || 0,
    dossiers: Number(row.dossiers) || 0,
  }
}

export function useCommissions(userId?: string, clientId?: string) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('commissions')
        .select('*, prime:primes(*)')
        .order('created_at', { ascending: false })

      if (userId) query = query.eq('user_id', userId)
      if (clientId) query = query.eq('client_id', clientId)

      const { data, error: err } = await query
      if (err) throw err
      const normalized = (data ?? []).map(c => normalizeCommission(c))
      setCommissions(normalized as Commission[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [userId, clientId])

  useEffect(() => { load() }, [load])

  useRealtime({
    table:    'commissions',
    onInsert: row => {
      const normalized = normalizeCommission(row) as unknown as Commission
      setCommissions(prev => prev.some(c => c.id === normalized.id) ? prev : [normalized, ...prev])
    },
    onUpdate: row => {
      const normalized = normalizeCommission(row) as unknown as Commission
      setCommissions(prev => prev.map(c => c.id === normalized.id ? { ...c, ...normalized } : c))
    },
    onDelete: row => setCommissions(prev => prev.filter(c => c.id !== (row as unknown as { id: string }).id)),
  })

  const add = useCallback(async (data: Omit<Commission, 'id' | 'created_at' | 'updated_at'>) => {
    const optimisticId = crypto.randomUUID()
    const optimistic = { ...data, id: optimisticId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    setCommissions(prev => [optimistic, ...prev])
    try {
      const { data: inserted, error: err } = await supabase
        .from('commissions')
        .insert(data)
        .select('*, prime:primes(*)')
        .single()
      if (err) throw err
      const normalized = normalizeCommission(inserted) as Commission
      setCommissions(prev => prev.map(c => c.id === optimisticId ? normalized : c))
      return normalized
    } catch (e) {
      setCommissions(prev => prev.filter(c => c.id !== optimisticId))
      throw e
    }
  }, [])

  const update = useCallback(async (id: string, data: Partial<Commission>) => {
    let snapshot: Commission | undefined
    setCommissions(cs => {
      snapshot = cs.find(c => c.id === id)
      return cs.map(c => c.id === id ? { ...c, ...data } : c)
    })
    try {
      const { error: err } = await supabase
        .from('commissions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      if (snapshot) setCommissions(cs => cs.map(c => c.id === id ? snapshot! : c))
      throw e
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    let snapshot: Commission | undefined
    setCommissions(cs => {
      snapshot = cs.find(c => c.id === id)
      return cs.filter(c => c.id !== id)
    })
    try {
      const { error: err } = await supabase.from('commissions').delete().eq('id', id)
      if (err) throw err
    } catch (e) {
      if (snapshot) setCommissions(cs => [snapshot!, ...cs])
      throw e
    }
  }, [])

  return { commissions, loading, error, reload: load, add, update, remove }
}
