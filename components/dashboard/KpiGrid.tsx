'use client'

import { useMemo } from 'react'
import KpiCard from './KpiCard'
import { formatCurrency } from '@/lib/utils'
import type { Commission, Paiement, SommeDue } from '@/lib/types'

interface KpiGridProps {
  commissions: Commission[]
  paiements:   Paiement[]
  sommesDues?: SommeDue[]
}

/** Sparkline des commissions par mois (6 derniers mois avec données). */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 600
  const h = 52
  const pad = 6
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / (values.length - 1)
    const y = h - pad - ((v - min) / range) * (h - 2 * pad)
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  const [lastX, lastY] = pts[pts.length - 1]

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-4" aria-hidden>
      <defs>
        <linearGradient id="lg-spark-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6a5cff" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="lg-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b7dff" stopOpacity=".25" />
          <stop offset="1" stopColor="#8b7dff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg-spark-fill)" />
      <path d={line} fill="none" stroke="url(#lg-spark-stroke)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="4" fill="#3b82f6" stroke="#0a0a0e" strokeWidth="2" />
    </svg>
  )
}

export default function KpiGrid({ commissions, paiements, sommesDues = [] }: KpiGridProps) {
  const { caTotal, commissionsTotal } = useMemo(() => ({
    caTotal:          commissions.reduce((s, c) => s + (Number(c.ca) || 0), 0),
    commissionsTotal: commissions.reduce((s, c) => s + (Number(c.commission) || 0), 0),
  }), [commissions])
  const { encaisse, enRetard } = useMemo(() => ({
    encaisse: paiements.filter(p => p.status === 'effectue').reduce((s, p) => s + (Number(p.montant) || 0), 0),
    enRetard: paiements.filter(p => p.status === 'en_retard').length,
  }), [paiements])

  const sommesDuesMontant = useMemo(() =>
    sommesDues.filter(s => s.status === 'du').reduce((s, d) => s + (Number(d.montant) || 0), 0),
  [sommesDues])

  const monthly = useMemo(() => {
    const byMois = new Map<string, number>()
    for (const c of commissions) {
      byMois.set(c.mois, (byMois.get(c.mois) ?? 0) + (Number(c.commission) || 0))
    }
    return [...byMois.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([, v]) => v)
  }, [commissions])

  const restantDu = (commissionsTotal - encaisse) + sommesDuesMontant
  const dossiersOuverts = useMemo(() => commissions.filter(c => c.status !== 'paye').length, [commissions])

  return (
    <div id="kpis" className="mb-8 animate-fadeIn">
      {/* Carte héros — le solde dû, façon Revolut */}
      <div className="glass-strong p-6 mb-4 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(106,92,255,.25), transparent 70%)', filter: 'blur(20px)' }}
        />
        <div className="relative">
          <p className="text-xs font-semibold text-lg-muted">Solde dû à l&apos;associé</p>
          <p className="text-[40px] font-extrabold text-lg-text leading-none mt-1.5" style={{ letterSpacing: '-0.045em' }}>
            {formatCurrency(Math.max(0, restantDu))}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {dossiersOuverts > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold text-lg-danger bg-[rgba(255,99,105,0.13)] border border-[rgba(255,99,105,0.22)]">
                {dossiersOuverts} dossier{dossiersOuverts > 1 ? 's' : ''} ouvert{dossiersOuverts > 1 ? 's' : ''}
              </span>
            )}
            {enRetard > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold text-lg-danger bg-[rgba(255,99,105,0.13)] border border-[rgba(255,99,105,0.22)]">
                {enRetard} paiement{enRetard > 1 ? 's' : ''} en retard
              </span>
            )}
            {sommesDuesMontant > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-semibold text-lg-warning bg-[rgba(240,163,60,0.13)] border border-[rgba(240,163,60,0.26)]">
                dont {formatCurrency(sommesDuesMontant)} de sommes diverses
              </span>
            )}
          </div>
          <Sparkline values={monthly} />
        </div>
      </div>

      {/* KPIs compacts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="CA total" value={formatCurrency(caTotal)} accent="#8b7dff" />
        <KpiCard label="Commissions totales" value={formatCurrency(commissionsTotal)} accent="#f0a33c" />
        <KpiCard label="Encaissé" value={formatCurrency(encaisse)} accent="#3ddc8b" />
      </div>
    </div>
  )
}
