'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from './useRealtime'
import type { Client } from '@/lib/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

      if (err) throw err
      setClients((data ?? []) as Client[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useRealtime({
    table:    'clients',
    onInsert: row => {
      const client = row as unknown as Client
      setClients(prev => prev.some(c => c.id === client.id) ? prev : [...prev, client].sort((a, b) => a.name.localeCompare(b.name)))
    },
    onUpdate: row => {
      const client = row as unknown as Client
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, ...client } : c))
    },
    onDelete: row => setClients(prev => prev.filter(c => c.id !== (row as unknown as { id: string }).id)),
  })

  const add = useCallback(async (data: { name: string; siren?: string; address?: string; email?: string; color?: string; created_by: string }) => {
    const optimisticId = crypto.randomUUID()
    const optimistic: Client = {
      id: optimisticId,
      name: data.name,
      siren: data.siren ?? null,
      address: data.address ?? null,
      email: data.email ?? null,
      color: data.color ?? '#6366f1',
      pinned: true,
      created_by: data.created_by,
      created_at: new Date().toISOString(),
    }
    setClients(prev => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)))
    try {
      const insertPayload = {
        name: data.name,
        siren: data.siren ?? null,
        address: data.address ?? null,
        email: data.email ?? null,
        color: data.color ?? '#6366f1',
        pinned: true,
        created_by: data.created_by,
      }
      const { data: inserted, error: err } = await supabase
        .from('clients')
        .insert(insertPayload)
        .select('*')
        .single()
      if (err) throw err
      const result = inserted as Client
      setClients(prev => prev.map(c => c.id === optimisticId ? result : c))

      // Auto-create chat channel for this client
      const slug = result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      await supabase.from('channels').insert({
        name: slug,
        type: 'client',
        client_id: result.id,
      })

      return result
    } catch (e) {
      setClients(prev => prev.filter(c => c.id !== optimisticId))
      throw e
    }
  }, [])

  const update = useCallback(async (id: string, data: { name?: string; siren?: string; address?: string; email?: string; color?: string }) => {
    let snapshot: Client[] = []
    setClients(prev => {
      snapshot = prev
      return prev.map(c => c.id === id ? { ...c, ...data } : c)
    })
    try {
      const { error: err } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      setClients(snapshot)
      throw e
    }
  }, [])

  const togglePin = useCallback(async (id: string) => {
    let snapshot: Client[] = []
    setClients(prev => {
      snapshot = prev
      return prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c)
    })
    try {
      const current = snapshot.find(c => c.id === id)
      if (!current) throw new Error('Client introuvable')
      const { error: err } = await supabase
        .from('clients')
        .update({ pinned: !current.pinned })
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      setClients(snapshot)
      throw e
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    let snapshot: Client[] = []
    setClients(prev => {
      snapshot = prev
      return prev.filter(c => c.id !== id)
    })
    try {
      const { error: err } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      if (err) throw err
    } catch (e) {
      setClients(snapshot)
      throw e
    }
  }, [])

  return { clients, loading, error, reload: load, add, update, togglePin, remove }
}
