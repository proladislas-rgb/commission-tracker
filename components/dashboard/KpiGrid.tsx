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

  const restantDu = (commissionsTotal - encaisse) + sommesDuesMontant

  return (
    <div id="kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fadeIn">
      <KpiCard
        label="CA Total"
        value={formatCurrency(caTotal)}
        accent="#6366f1"
      />
      <KpiCard
        label="Commissions totales"
        value={formatCurrency(commissionsTotal)}
        accent="#f59e0b"
      />
      <KpiCard
        label="Encaissé"
        value={formatCurrency(encaisse)}
        accent="#22c55e"
      />
      <KpiCard
        label="Restant dû"
        value={formatCurrency(Math.max(0, restantDu))}
        accent="#f43f5e"
        subtext={
          <>
            {enRetard > 0 && (
              <span className="text-[11px] text-rose block">
                {enRetard} paiement{enRetard > 1 ? 's' : ''} en retard
              </span>
            )}
            {sommesDuesMontant > 0 && (
              <span className="text-[11px] text-amber block">
                dont {formatCurrency(sommesDuesMontant)} de sommes diverses
              </span>
            )}
          </>
        }
      />
    </div>
  )
}
