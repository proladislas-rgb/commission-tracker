import type Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import type { ReemContext } from '@/lib/reem-types'

export interface AgentToolResult {
  type: 'data' | 'draft_email' | 'navigation'
  result: unknown
}

export interface AgentContext {
  clientId: string | null
  userId: string
  googleAccessToken: string | null
  pageContext?: ReemContext
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_data',
    description: 'Lire des données de l\'application. Choisir entity parmi: commissions, paiements, clients, sommes_dues, primes, activity. Filters optionnels (client_id, status, mois, limit).',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity: {
          type: 'string',
          enum: ['commissions', 'paiements', 'clients', 'sommes_dues', 'primes', 'activity'],
          description: 'Type d\'entité à interroger',
        },
        filters: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            status: { type: 'string' },
            mois: { type: 'string', description: 'Format YYYY-MM' },
            limit: { type: 'number', description: 'Max 50' },
          },
        },
      },
      required: ['entity'],
    },
  },
  {
    name: 'get_overdue_payments',
    description: 'Récupérer les paiements en retard (statut en_retard ou en_attente) depuis plus de threshold_days jours. Utile pour rédiger des relances ciblées.',
    input_schema: {
      type: 'object' as const,
      properties: {
        threshold_days: { type: 'number', description: 'Seuil en jours (défaut 30)' },
        client_id: { type: 'string', description: 'Filtrer par client' },
      },
      required: [],
    },
  },
  {
    name: 'summarize_period',
    description: 'Générer une synthèse narrative chiffrée d\'une période. Utilise cet outil pour "résume-moi le mois" ou "que s\'est-il passé cette semaine".',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: { type: 'string', enum: ['week', 'month', 'quarter'], description: 'Période à résumer' },
        client_id: { type: 'string', description: 'Filtrer par client' },
      },
      required: ['period'],
    },
  },
  {
    name: 'search_drive',
    description: 'Rechercher des fichiers dans Google Drive par nom.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Terme de recherche' },
      },
      required: ['query'],
    },
  },
  {
    name: 'draft_email',
    description: 'Préparer un brouillon d\'email (libre ou relance). Retourne un lien que l\'utilisateur peut cliquer pour ouvrir le tiroir Workspace pré-rempli.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Destinataire (email)' },
        subject: { type: 'string', description: 'Objet' },
        body: { type: 'string', description: 'Corps du message (texte brut, retours à la ligne OK)' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'propose_navigation',
    description: 'Proposer à l\'utilisateur d\'ouvrir une page spécifique de l\'application. Retourne un lien cliquable que l\'utilisateur doit activer lui-même. Ne navigue jamais automatiquement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pathname: { type: 'string', description: 'Chemin Next.js (ex: /dashboard/clients/ecodistrib-id)' },
        label: { type: 'string', description: 'Libellé affiché sur le chip (ex: ECODISTRIB)' },
      },
      required: ['pathname', 'label'],
    },
  },
]

async function getPeriodBounds(period: 'week' | 'month' | 'quarter'): Promise<{ from: string; to: string }> {
  const to = new Date()
  const from = new Date()
  if (period === 'week') from.setDate(from.getDate() - 7)
  else if (period === 'month') from.setMonth(from.getMonth() - 1)
  else from.setMonth(from.getMonth() - 3)
  return { from: from.toISOString(), to: to.toISOString() }
}

export async function executeAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  context: AgentContext,
): Promise<AgentToolResult> {
  const effectiveClientId =
    (input.client_id as string | undefined) ??
    ((input.filters as Record<string, unknown> | undefined)?.client_id as string | undefined) ??
    context.clientId

  switch (toolName) {
    case 'query_data': {
      const entity = String(input.entity)
      const filters = (input.filters ?? {}) as Record<string, unknown>
      const limit = Math.min(Number(filters.limit) || 20, 50)

      if (entity === 'commissions') {
        let q = supabaseAdmin
          .from('commissions')
          .select('*, prime:primes(name, color)')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        if (filters.status) q = q.eq('status', String(filters.status))
        if (filters.mois) q = q.eq('mois', String(filters.mois))
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'paiements') {
        let q = supabaseAdmin.from('paiements').select('*').order('date', { ascending: false }).limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        if (filters.status) q = q.eq('status', String(filters.status))
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'clients') {
        const { data, error } = await supabaseAdmin.from('clients').select('*').order('name').limit(limit)
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'sommes_dues') {
        let q = supabaseAdmin.from('sommes_dues').select('*').limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'primes') {
        let q = supabaseAdmin.from('primes').select('*').order('name').limit(limit)
        if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      if (entity === 'activity') {
        const { data, error } = await supabaseAdmin
          .from('activity_log')
          .select('*, user:users(display_name)')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (error) throw new Error(error.message)
        return { type: 'data', result: data }
      }

      throw new Error(`Entity inconnue: ${entity}`)
    }

    case 'get_overdue_payments': {
      const thresholdDays = Number(input.threshold_days) || 30
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - thresholdDays)

      let q = supabaseAdmin
        .from('paiements')
        .select('*, client:clients(name)')
        .in('status', ['en_retard', 'en_attente'])
        .lt('date', cutoff.toISOString().slice(0, 10))
        .order('date', { ascending: true })
      if (effectiveClientId) q = q.eq('client_id', effectiveClientId)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'summarize_period': {
      const period = String(input.period) as 'week' | 'month' | 'quarter'
      const { from, to } = await getPeriodBounds(period)

      let commQ = supabaseAdmin.from('commissions').select('*').gte('created_at', from).lte('created_at', to)
      let payQ = supabaseAdmin.from('paiements').select('*').gte('date', from.slice(0, 10)).lte('date', to.slice(0, 10))
      if (effectiveClientId) {
        commQ = commQ.eq('client_id', effectiveClientId)
        payQ = payQ.eq('client_id', effectiveClientId)
      }
      const [commissions, paiements] = await Promise.all([commQ, payQ])
      if (commissions.error) throw new Error(commissions.error.message)
      if (paiements.error) throw new Error(paiements.error.message)

      const totalCA = (commissions.data ?? []).reduce((sum, c) => sum + (Number(c.ca) || 0), 0)
      const totalCommissions = (commissions.data ?? []).reduce((sum, c) => sum + (Number(c.commission) || 0), 0)
      const paidCount = (paiements.data ?? []).filter(p => p.status === 'effectue').length
      const overdueCount = (paiements.data ?? []).filter(p => p.status === 'en_retard').length

      return {
        type: 'data',
        result: {
          period,
          from,
          to,
          stats: {
            commissions_count: commissions.data?.length ?? 0,
            ca_total: totalCA,
            commission_total: totalCommissions,
            paiements_effectues: paidCount,
            paiements_en_retard: overdueCount,
          },
          commissions: commissions.data,
          paiements: paiements.data,
        },
      }
    }

    case 'search_drive': {
      if (!context.googleAccessToken) {
        return { type: 'data', result: { error: 'Non connecté à Google Drive.' } }
      }
      const q = encodeURIComponent(`name contains '${String(input.query).replace(/'/g, "\\'")}'`)
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&pageSize=10`,
        { headers: { Authorization: `Bearer ${context.googleAccessToken}` } },
      )
      if (!res.ok) {
        return { type: 'data', result: { error: `Erreur Drive : ${res.status}` } }
      }
      const json = await res.json() as { files: unknown[] }
      return { type: 'data', result: json.files }
    }

    case 'draft_email': {
      return {
        type: 'draft_email',
        result: {
          to: String(input.to),
          subject: String(input.subject),
          body: String(input.body),
        },
      }
    }

    case 'propose_navigation': {
      return {
        type: 'navigation',
        result: {
          pathname: String(input.pathname),
          label: String(input.label),
        },
      }
    }

    default:
      throw new Error(`Outil inconnu : ${toolName}`)
  }
}
