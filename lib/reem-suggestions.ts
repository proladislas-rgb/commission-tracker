// lib/reem-suggestions.ts

const DASHBOARD_SUGGESTIONS = [
  '💡 Résume-moi ce mois',
  '⚠️ Paiements en retard ?',
  '📊 Top clients du trimestre',
]

const CLIENT_PAGE_SUGGESTIONS = [
  '📈 Historique de ce client',
  '✉️ Rédiger une relance',
  '➕ Nouvelle commission',
]

const INVOICES_SUGGESTIONS = [
  '🧾 Résumer la facturation de ce mois',
  '💡 Quelles factures marquer comme payées ?',
]

const WORKSPACE_SUGGESTIONS = [
  '✉️ Reformuler plus professionnel',
  '💡 Suggérer un objet',
  '🔍 Corriger le ton',
  '🔍 Trouver un fichier Drive',
]

const FALLBACK_SUGGESTIONS = [
  '💡 Résume-moi ce mois',
  '⚠️ Que dois-je traiter en priorité ?',
]

export function getSuggestions(pathname: string): string[] {
  if (pathname === '/dashboard') return DASHBOARD_SUGGESTIONS
  if (pathname.startsWith('/dashboard/clients')) return CLIENT_PAGE_SUGGESTIONS
  if (pathname.startsWith('/dashboard/invoices')) return INVOICES_SUGGESTIONS
  if (pathname.startsWith('/dashboard/workspace')) return WORKSPACE_SUGGESTIONS
  return FALLBACK_SUGGESTIONS
}
