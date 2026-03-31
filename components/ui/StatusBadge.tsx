import type { PaiementStatus, CommissionStatus } from '@/lib/types'
import { paiementStatusLabel, commissionStatusLabel } from '@/lib/utils'

const paiementColors: Record<PaiementStatus, string> = {
  effectue:   '#22c55e',
  en_attente: '#f59e0b',
  en_retard:  '#f43f5e',
}

const commissionColors: Record<CommissionStatus, string> = {
  due:     '#f43f5e',
  partiel: '#f59e0b',
  paye:    '#22c55e',
}

interface PaiementBadgeProps {
  status: PaiementStatus
}

interface CommissionBadgeProps {
  status: CommissionStatus
}

export function PaiementStatusBadge({ status }: PaiementBadgeProps) {
  const color = paiementColors[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {paiementStatusLabel(status)}
    </span>
  )
}

export function CommissionStatusBadge({ status }: CommissionBadgeProps) {
  const color = commissionColors[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {commissionStatusLabel(status)}
    </span>
  )
}
