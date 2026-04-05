import type Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

export interface AgentToolResult {
  type: 'data' | 'confirm' | 'draft_email'
  result: unknown
}

interface AgentContext {
  clientId: string | null
  userId: string
  googleAccessToken: string | null
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_commissions',
    description: 'Interroger les commissions avec filtres optionnels (client_id, prime_id, status, mois)',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Filtrer par client' },
        prime_id: { type: 'string', description: 'Filtrer par prime' },
        status: { type: 'string', enum: ['due', 'partiel', 'paye'], description: 'Filtrer par statut' },
        mois: { type: 'string', description: 'Filtrer par mois (YYYY-MM)' },
      },
      required: [],
    },
  },
  {
    name: 'query_paiements',
    description: 'Interroger les paiements avec filtres optionnels (client_id, status)',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Filtrer par client' },
        status: { type: 'string', enum: ['effectue', 'en_attente', 'en_retard'], description: 'Filtrer par statut' },
      },
      required: [],
    },
  },
  {
    name: 'query_clients',
    description: 'Lister tous les clients',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_sommes_dues',
    description: 'Interroger les sommes dues, optionnellement par client',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Filtrer par client' },
      },
      required: [],
    },
  },
  {
    name: 'query_activity',
    description: 'Consulter le journal d\'activité récent',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Nombre d\'entrées (défaut 10)' },
      },
      required: [],
    },
  },
  {
    name: 'create_commission',
    description: 'Préparer la création d\'une commission (nécessite confirmation)',
    input_schema: {
      type: 'object' as const,
      properties: {
        prime_id: { type: 'string', description: 'ID de la prime' },
        ca: { type: 'number', description: 'Chiffre d\'affaires' },
        commission: { type: 'number', description: 'Montant de la commission' },
        dossiers: { type: 'number', description: 'Nombre de dossiers' },
        mois: { type: 'string', description: 'Mois (YYYY-MM)' },
        status: { type: 'string', enum: ['due', 'partiel', 'paye'], description: 'Statut' },
      },
      required: ['prime_id', 'ca', 'commission', 'dossiers', 'mois', 'status'],
    },
  },
  {
    name: 'create_paiement',
    description: 'Préparer la création d\'un paiement (nécessite confirmation)',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Date du paiement (YYYY-MM-DD)' },
        montant: { type: 'number', description: 'Montant en euros' },
        label: { type: 'string', description: 'Libellé du paiement' },
        status: { type: 'string', enum: ['effectue', 'en_attente', 'en_retard'], description: 'Statut' },
      },
      required: ['date', 'montant', 'label', 'status'],
    },
  },
  {
    name: 'search_drive',
    description: 'Rechercher des fichiers dans Google Drive',
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
    description: 'Composer un brouillon d\'email',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Destinataire' },
        subject: { type: 'string', description: 'Objet' },
        body: { type: 'string', description: 'Corps du message' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
]

export async function executeAgentTool(
  toolName: string,
  input: Record<string, unknown>,
  context: AgentContext,
): Promise<AgentToolResult> {
  const effectiveClientId = (input.client_id as string | undefined) ?? context.clientId

  switch (toolName) {
    case 'query_commissions': {
      let query = supabaseAdmin
        .from('commissions')
        .select('*, prime:primes(name, color, icon)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (effectiveClientId) query = query.eq('client_id', effectiveClientId)
      if (input.prime_id) query = query.eq('prime_id', String(input.prime_id))
      if (input.status) query = query.eq('status', String(input.status))
      if (input.mois) query = query.eq('mois', String(input.mois))
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'query_paiements': {
      let query = supabaseAdmin
        .from('paiements')
        .select('*')
        .order('date', { ascending: false })
        .limit(20)
      if (effectiveClientId) query = query.eq('client_id', effectiveClientId)
      if (input.status) query = query.eq('status', String(input.status))
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'query_clients': {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .order('name')
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'query_sommes_dues': {
      let query = supabaseAdmin.from('sommes_dues').select('*')
      if (effectiveClientId) query = query.eq('client_id', effectiveClientId)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'query_activity': {
      const limit = Number(input.limit) || 10
      const { data, error } = await supabaseAdmin
        .from('activity_log')
        .select('*, user:users(display_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(error.message)
      return { type: 'data', result: data }
    }

    case 'create_commission': {
      const { data: prime } = await supabaseAdmin
        .from('primes')
        .select('name')
        .eq('id', String(input.prime_id))
        .single()
      return {
        type: 'confirm',
        result: {
          action: 'create_commission',
          data: {
            prime_id: String(input.prime_id),
            prime_name: prime?.name ?? 'Inconnue',
            ca: Number(input.ca),
            commission: Number(input.commission),
            dossiers: Number(input.dossiers),
            mois: String(input.mois),
            status: String(input.status),
            client_id: effectiveClientId,
            user_id: context.userId,
            created_by: context.userId,
          },
        },
      }
    }

    case 'create_paiement': {
      return {
        type: 'confirm',
        result: {
          action: 'create_paiement',
          data: {
            date: String(input.date),
            montant: Number(input.montant),
            label: String(input.label),
            status: String(input.status),
            client_id: effectiveClientId,
            created_by: context.userId,
          },
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

    default:
      throw new Error(`Outil inconnu : ${toolName}`)
  }
}
