'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Insight } from '@/lib/reem-types'
import { useReemUI } from './ReemUIProvider'

const CACHE_KEY = 'reem.insights.cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CachedInsights {
  insights: Insight[]
  fetchedAt: number
}

function loadCache(): CachedInsights | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedInsights
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function saveCache(insights: Insight[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ insights, fetchedAt: Date.now() }))
  } catch {
    // silencieux
  }
}

/** Utilitaire exportable pour invalider le cache depuis d'autres hooks (après une mutation CRUD) */
export function invalidateReemInsightsCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // silencieux
  }
}

export default function ReemInsights() {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const { setState } = useReemUI()

  const fetchInsights = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadCache()
      if (cached) {
        setInsights(cached.insights)
        setFetchedAt(cached.fetchedAt)
        return
      }
    } else {
      invalidateReemInsightsCache()
    }

    setLoading(true)
    try {
      const res = await fetch('/api/agent/insights')
      if (!res.ok) {
        setInsights([])
        return
      }
      const data = (await res.json()) as { insights: Insight[] }
      const next = data.insights ?? []
      setInsights(next)
      setFetchedAt(Date.now())
      saveCache(next)
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleInsightClick = (insight: Insight) => {
    setState(prev => ({
      ...prev,
      visibility: 'panel-open',
      draftMessage: insight.actionPrompt,
    }))
  }

  const handleRefresh = () => {
    fetchInsights(true)
  }

  // Loading state : afficher un mini indicateur discret pendant le premier fetch
  if (loading && !insights) {
    return (
      <section
        aria-label="Insights Reem AI (chargement)"
        style={{
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#3d4f63',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#818cf8',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        Reem analyse…
      </section>
    )
  }

  if (!insights || insights.length === 0) return null

  const severityColor: Record<Insight['severity'], string> = {
    info: '#818cf8',
    warning: '#f59e0b',
    alert: '#f43f5e',
  }

  const ageMin = fetchedAt ? Math.floor((Date.now() - fetchedAt) / 60000) : null

  return (
    <section
      aria-label="Insights Reem AI"
      style={{
        marginTop: '40px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#3d4f63',
          fontWeight: 600,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8' }} />
        <span>Reem observe</span>
        {loading && <span style={{ color: '#8898aa', textTransform: 'none', letterSpacing: 0 }}>— analyse en cours…</span>}
        {!loading && ageMin !== null && (
          <span style={{ color: '#3d4f63', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            · il y a {ageMin === 0 ? 'moins d\'une minute' : `${ageMin} min`}
          </span>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Actualiser les insights"
          title="Actualiser (force une nouvelle analyse par Reem)"
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#8898aa',
            fontSize: '10px',
            textTransform: 'none',
            letterSpacing: 0,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
              e.currentTarget.style.color = '#818cf8'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#8898aa'
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Actualiser
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {insights.map(insight => (
          <button
            key={insight.id}
            type="button"
            onClick={() => handleInsightClick(insight)}
            style={{
              textAlign: 'left',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${severityColor[insight.severity]}33`,
              borderLeft: `3px solid ${severityColor[insight.severity]}`,
              borderRadius: '10px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>{insight.icon}</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8edf5' }}>{insight.title}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#8898aa', lineHeight: 1.5, marginBottom: '8px' }}>
              {insight.description}
            </div>
            <div style={{ fontSize: '11px', color: severityColor[insight.severity], fontWeight: 500 }}>
              → {insight.actionLabel}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
