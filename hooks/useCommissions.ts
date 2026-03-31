'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { Commission } from '@/lib/types'

export function useCommissions(userId?: string) {
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

      const { data, error: err } = await query
      if (err) throw err
      setCommissions(data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  useRealtime({
    table:    'commissions',
    onInsert: row => setCommissions(prev => [row as unknown as Commission, ...prev]),
    onUpdate: row => setCommissions(prev => prev.map(c => c.id === (row as unknown as Commission).id ? { ...c, ...row as unknown as Commission } : c)),
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
      setCommissions(prev => prev.map(c => c.id === optimisticId ? inserted : c))
      return inserted
    } catch (e) {
      setCommissions(prev => prev.filter(c => c.id !== optimisticId))
      throw e
    }
  }, [])

  const update = useCallback(async (id: string, data: Partial<Commission>) => {
    const prev = commissions.find(c => c.id === id)
    setCommissions(cs => cs.map(c => c.id === id ? { ...c, ...data } : c))
    try {
      const { error: err } = await supabase
        .from('commissions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      if (prev) setCommissions(cs => cs.map(c => c.id === id ? prev : c))
      throw e
    }
  }, [commissions])

  const remove = useCallback(async (id: string) => {
    const backup = commissions.find(c => c.id === id)
    setCommissions(cs => cs.filter(c => c.id !== id))
    try {
      const { error: err } = await supabase.from('commissions').delete().eq('id', id)
      if (err) throw err
    } catch (e) {
      if (backup) setCommissions(cs => [backup, ...cs])
      throw e
    }
  }, [commissions])

  return { commissions, loading, error, reload: load, add, update, remove }
}
