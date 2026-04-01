import type { CommissionStatus } from './types'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffSec < 60) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH}h`
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD} jours`
  return formatDate(dateStr)
}

export function formatMois(mois: string): string {
  const [year, month] = mois.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  return new Date().getTime() - new Date(lastSeen).getTime() < 2 * 60 * 1000
}

export function commissionStatusLabel(status: CommissionStatus): string {
  switch (status) {
    case 'due':     return 'Dû'
    case 'partiel': return 'Partiel'
    case 'paye':    return 'Payé'
  }
}

export function avatarInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
