'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { SommeDue, SommeDueStatus } from '@/lib/types'

function normalize<T extends Record<string, unknown>>(row: T): T {
  return { ...row, montant: Number(row.montant) || 0 }
}

export function useSommesDues(clientId?: string) {
  const [sommesDues, setSommesDues] = useState<SommeDue[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('sommes_dues')
        .select('*')
        .order('created_at', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error: err } = await query
      if (err) throw err
      setSommesDues((data ?? []).map(r => normalize(r)) as SommeDue[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { load() }, [load])

  useRealtime({
    table:    'sommes_dues',
    onInsert: row => {
      const n = normalize(row) as unknown as SommeDue
      setSommesDues(prev => prev.some(s => s.id === n.id) ? prev : [n, ...prev])
    },
    onUpdate: row => {
      const n = normalize(row) as unknown as SommeDue
      setSommesDues(prev => prev.map(s => s.id === n.id ? { ...s, ...n } : s))
    },
    onDelete: row => setSommesDues(prev => prev.filter(s => s.id !== (row as unknown as { id: string }).id)),
  })

  const add = useCallback(async (data: { label: string; montant: number; created_by: string }) => {
    const optimisticId = crypto.randomUUID()
    const optimistic: SommeDue = {
      id: optimisticId,
      label: data.label,
      montant: data.montant,
      status: 'du',
      created_by: data.created_by,
      client_id: clientId ?? null,
      created_at: new Date().toISOString(),
    }
    setSommesDues(prev => [optimistic, ...prev])
    try {
      const { data: inserted, error: err } = await supabase
        .from('sommes_dues')
        .insert({ label: data.label, montant: data.montant, status: 'du', created_by: data.created_by, client_id: clientId })
        .select('*')
        .single()
      if (err) throw err
      const normalized = normalize(inserted) as SommeDue
      setSommesDues(prev => prev.map(s => s.id === optimisticId ? normalized : s))
      return normalized
    } catch (e) {
      setSommesDues(prev => prev.filter(s => s.id !== optimisticId))
      throw e
    }
  }, [clientId])

  const updateStatus = useCallback(async (id: string, status: SommeDueStatus) => {
    let snapshot: SommeDue[] = []
    setSommesDues(prev => {
      snapshot = prev
      return prev.map(s => s.id === id ? { ...s, status } : s)
    })
    try {
      const { error: err } = await supabase
        .from('sommes_dues')
        .update({ status })
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      setSommesDues(snapshot)
      throw e
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    let snapshot: SommeDue[] = []
    setSommesDues(prev => {
      snapshot = prev
      return prev.filter(s => s.id !== id)
    })
    try {
      const { error: err } = await supabase
        .from('sommes_dues')
        .delete()
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      setSommesDues(snapshot)
      throw e
    }
  }, [])

  return { sommesDues, loading, error, reload: load, add, updateStatus, remove }
}
