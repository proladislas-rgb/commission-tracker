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

const SEGMENTS = {
  encaisse:  { label: 'Encaissé',   color: '#3ddc8b' },
  enAttente: { label: 'En attente', color: '#f0a33c' },
  enRetard:  { label: 'En retard',  color: '#ff8589' },
} as const

export default function KpiGrid({ commissions, paiements, sommesDues = [] }: KpiGridProps) {
  const { caTotal, commissionsTotal } = useMemo(() => ({
    caTotal:          commissions.reduce((s, c) => s + (Number(c.ca) || 0), 0),
    commissionsTotal: commissions.reduce((s, c) => s + (Number(c.commission) || 0), 0),
  }), [commissions])

  const { encaisse, enAttente, enRetard, enRetardCount } = useMemo(() => ({
    encaisse:      paiements.filter(p => p.status === 'effectue').reduce((s, p) => s + (Number(p.montant) || 0), 0),
    enAttente:     paiements.filter(p => p.status === 'en_attente').reduce((s, p) => s + (Number(p.montant) || 0), 0),
    enRetard:      paiements.filter(p => p.status === 'en_retard').reduce((s, p) => s + (Number(p.montant) || 0), 0),
    enRetardCount: paiements.filter(p => p.status === 'en_retard').length,
  }), [paiements])

  const sommesDuesMontant = useMemo(() =>
    sommesDues.filter(s => s.status === 'du').reduce((s, d) => s + (Number(d.montant) || 0), 0),
  [sommesDues])

  const totalDu    = commissionsTotal + sommesDuesMontant
  const restantDu  = totalDu - encaisse
  const dossiersOuverts = useMemo(() => commissions.filter(c => c.status !== 'paye').length, [commissions])

  // Dénominateur : si les paiements déclarés dépassent le total dû, on garde des proportions exactes
  const denom = Math.max(totalDu, encaisse + enAttente + enRetard)
  const pct = (v: number) => denom > 0 ? Math.max(0, Math.min(100, (v / denom) * 100)) : 0
  const pctEncaisse = totalDu > 0 ? Math.min(100, (encaisse / totalDu) * 100) : 0

  const repartition = [
    { ...SEGMENTS.encaisse,  value: encaisse },
    { ...SEGMENTS.enAttente, value: enAttente },
    { ...SEGMENTS.enRetard,  value: enRetard },
  ]

  return (
    <div id="kpis" className="mb-8 animate-fadeIn">
      {/* Carte héros — le solde dû, façon Revolut */}
      <div className="glass-strong p-6 mb-4 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(106,92,255,.25), transparent 70%)', filter: 'blur(20px)' }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,360px)] gap-6">

          {/* Gauche : solde + badges + répartition */}
          <div className="flex flex-col">
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
              {enRetardCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold text-lg-danger bg-[rgba(255,99,105,0.13)] border border-[rgba(255,99,105,0.22)]">
                  {enRetardCount} paiement{enRetardCount > 1 ? 's' : ''} en retard
                </span>
              )}
              {sommesDuesMontant > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-semibold text-lg-warning bg-[rgba(240,163,60,0.13)] border border-[rgba(240,163,60,0.26)]">
                  dont {formatCurrency(sommesDuesMontant)} de sommes diverses
                </span>
              )}
            </div>

            {/* Répartition du total dû */}
            <div className="mt-auto pt-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.9px] font-semibold text-lg-muted">Répartition du total dû</span>
                <span className="text-[11px] font-bold text-lg-text">{pctEncaisse.toFixed(1)} % encaissé</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden flex bg-[rgba(255,255,255,0.06)]">
                {repartition.map(s => s.value > 0 && (
                  <div key={s.label} style={{ width: `${pct(s.value)}%`, background: s.color }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
                {repartition.map(s => (
                  <span key={s.label} className="inline-flex items-center gap-1.5 text-[10.5px] text-lg-muted">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                    <span className="font-bold" style={{ color: s.color }}>{formatCurrency(s.value)}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-lg-muted">
                  <span className="h-2 w-2 rounded-full shrink-0 bg-[rgba(255,255,255,0.18)]" />
                  Restant
                  <span className="font-bold text-lg-text">{formatCurrency(Math.max(0, totalDu - encaisse - enAttente - enRetard))}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Droite : détail du solde, ligne à ligne */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="text-[10px] uppercase tracking-[0.9px] font-semibold text-lg-muted mb-3">Détail du solde</p>

            <div className="flex items-baseline justify-between py-1.5">
              <span className="text-[12.5px] text-lg-muted">Commissions générées</span>
              <span className="text-[12.5px] font-bold text-lg-text">{formatCurrency(commissionsTotal)}</span>
            </div>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="text-[12.5px] text-lg-muted">Sommes diverses dues</span>
              <span className="text-[12.5px] font-bold text-lg-text">+ {formatCurrency(sommesDuesMontant)}</span>
            </div>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="text-[12.5px] text-lg-muted">Déjà encaissé</span>
              <span className="text-[12.5px] font-bold" style={{ color: '#3ddc8b' }}>− {formatCurrency(encaisse)}</span>
            </div>

            <div className="my-2.5 border-t border-[rgba(255,255,255,0.08)]" />

            <div className="flex items-baseline justify-between py-1">
              <span className="text-[12.5px] font-semibold text-lg-text">Reste à percevoir</span>
              <span className="text-[15px] font-extrabold text-lg-text" style={{ letterSpacing: '-0.02em' }}>
                {formatCurrency(Math.max(0, restantDu))}
              </span>
            </div>

            <div className="my-2.5 border-t border-[rgba(255,255,255,0.08)]" />

            <p className="text-[10px] uppercase tracking-[0.9px] font-semibold text-lg-muted mb-1.5 mt-3">Virements en cours</p>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="inline-flex items-center gap-2 text-[12.5px] text-lg-muted">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEGMENTS.enAttente.color }} />
                En attente
              </span>
              <span className="text-[12.5px] font-bold" style={{ color: SEGMENTS.enAttente.color }}>{formatCurrency(enAttente)}</span>
            </div>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="inline-flex items-center gap-2 text-[12.5px] text-lg-muted">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: SEGMENTS.enRetard.color }} />
                En retard
              </span>
              <span className="text-[12.5px] font-bold" style={{ color: SEGMENTS.enRetard.color }}>{formatCurrency(enRetard)}</span>
            </div>
          </div>
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
