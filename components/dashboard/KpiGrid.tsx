'use client'

import KpiCard from './KpiCard'
import { formatCurrency } from '@/lib/utils'
import type { Commission, Paiement } from '@/lib/types'

interface KpiGridProps {
  commissions: Commission[]
  paiements:   Paiement[]
}

export default function KpiGrid({ commissions, paiements }: KpiGridProps) {
  const caTotal          = commissions.reduce((s, c) => s + Number(c.ca), 0)
  const commissionsTotal = commissions.reduce((s, c) => s + Number(c.commission), 0)
  const encaisse         = paiements.filter(p => p.status === 'effectue').reduce((s, p) => s + Number(p.montant), 0)
  const restantDu        = commissionsTotal - encaisse
  const enRetard         = paiements.filter(p => p.status === 'en_retard').length

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
          enRetard > 0 ? (
            <span className="text-[11px] text-rose">
              {enRetard} paiement{enRetard > 1 ? 's' : ''} en retard
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
