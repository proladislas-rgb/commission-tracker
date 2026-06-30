// Modèle Anthropic utilisé par toutes les routes IA (Reem chat, insights, facturation).
// Alias non daté → suit toujours une version active (cf. lessons 2026-06-30 :
// un ID daté finit par être retiré et provoque un 404 sur toutes les routes).
// Source unique de vérité : ne pas hardcoder le modèle ailleurs.
export const CLAUDE_MODEL = 'claude-sonnet-4-6'

export const PRIME_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#38bdf8', label: 'Sky' },
  { value: '#8b5cf6', label: 'Violet' },
]

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(20,20,26,0.92)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: '14px',
  boxShadow: '0 12px 44px rgba(0,0,0,0.4)',
  fontSize: '12px',
}

export function slugifyPrimeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
