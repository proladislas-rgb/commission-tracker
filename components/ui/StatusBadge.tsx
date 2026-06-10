import type { CommissionStatus } from '@/lib/types'
import { commissionStatusLabel } from '@/lib/utils'

const commissionColors: Record<CommissionStatus, { color: string; bg: string; border: string }> = {
  due:     { color: '#ff8589', bg: 'rgba(255,99,105,0.13)', border: 'rgba(255,99,105,0.22)' },
  partiel: { color: '#f0a33c', bg: 'rgba(240,163,60,0.13)', border: 'rgba(240,163,60,0.26)' },
  paye:    { color: '#3ddc8b', bg: 'rgba(61,220,139,0.12)', border: 'rgba(61,220,139,0.24)' },
}

interface CommissionBadgeProps {
  status: CommissionStatus
}

export function CommissionStatusBadge({ status }: CommissionBadgeProps) {
  const { color, bg, border } = commissionColors[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
      style={{ backgroundColor: bg, color, border: `1px solid ${border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {commissionStatusLabel(status)}
    </span>
  )
}
