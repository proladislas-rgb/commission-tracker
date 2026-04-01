import type { CommissionStatus } from '@/lib/types'
import { commissionStatusLabel } from '@/lib/utils'

const commissionColors: Record<CommissionStatus, string> = {
  due:     '#f43f5e',
  partiel: '#f59e0b',
  paye:    '#22c55e',
}

interface CommissionBadgeProps {
  status: CommissionStatus
}

export function CommissionStatusBadge({ status }: CommissionBadgeProps) {
  const color = commissionColors[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: `${color}22`, color, boxShadow: `0 0 8px ${color}20` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
      {commissionStatusLabel(status)}
    </span>
  )
}
