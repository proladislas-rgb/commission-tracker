export const PRIME_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#38bdf8', label: 'Sky' },
  { value: '#8b5cf6', label: 'Violet' },
]

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#151a24',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: 10,
}

export function slugifyPrimeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
