'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { PresenceDay, PresenceType, PresenceYear } from '@/lib/types'

const CURRENT_YEAR = new Date().getFullYear()

export function usePresence(initialYear?: number) {
  const [year, setYear] = useState(initialYear ?? CURRENT_YEAR)
  const [days, setDays] = useState<PresenceDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (y: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sheets/presence?year=${y}`)
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        throw new Error(data.error)
      }
      const data = (await res.json()) as PresenceYear
      setDays(data.days)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(year)
  }, [year, load])

  const changeYear = useCallback((y: number) => {
    setYear(y)
  }, [])

  /** Toggle la présence d'un jour : france → bahrein → autres → null → france */
  const toggleDay = useCallback(async (dayIndex: number) => {
    const day = days[dayIndex]
    if (!day) return

    const cycle: PresenceType[] = ['france', 'bahrein', 'autres', null]
    const currentIdx = cycle.indexOf(day.presence)
    const next = cycle[(currentIdx + 1) % cycle.length]

    // Optimistic update
    setDays(prev =>
      prev.map((d, i) => (i === dayIndex ? { ...d, presence: next } : d))
    )

    try {
      const res = await fetch('/api/sheets/presence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, sheetRow: day.sheetRow, presence: next }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        throw new Error(data.error)
      }
    } catch (e) {
      // Rollback
      setDays(prev =>
        prev.map((d, i) => (i === dayIndex ? { ...d, presence: day.presence } : d))
      )
      setError(e instanceof Error ? e.message : 'Erreur de mise à jour')
    }
  }, [days, year])

  /** Compteurs annuels */
  const counters = useMemo(() => {
    let france = 0
    let bahrein = 0
    let autres = 0
    for (const d of days) {
      if (d.presence === 'france') france++
      else if (d.presence === 'bahrein') bahrein++
      else if (d.presence === 'autres') autres++
    }
    return { france, bahrein, autres }
  }, [days])

  return { year, days, loading, error, counters, changeYear, toggleDay, reload: () => load(year) }
}
