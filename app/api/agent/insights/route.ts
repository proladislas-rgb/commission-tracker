import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Insight } from '@/lib/reem-types'

const INSIGHTS_TOOL: Anthropic.Tool = {
  name: 'return_insights',
  description: 'Retourne jusqu\'à 3 insights actionnables sur l\'activité récente de l\'utilisateur.',
  input_schema: {
    type: 'object' as const,
    properties: {
      insights: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Identifiant unique (slug)' },
            severity: { type: 'string', enum: ['info', 'warning', 'alert'] },
            icon: { type: 'string', description: 'Un emoji (ex: ⚠️, 💡, 📊)' },
            title: { type: 'string', description: 'Titre court max 8 mots' },
            description: { type: 'string', description: 'Une phrase précise avec chiffres' },
            actionLabel: { type: 'string', description: 'Libellé du bouton d\'action' },
            actionPrompt: { type: 'string', description: 'Prompt exact à envoyer à Reem au clic' },
          },
          required: ['id', 'severity', 'icon', 'title', 'description', 'actionLabel', 'actionPrompt'],
        },
      },
    },
    required: ['insights'],
  },
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const cutoff = ninetyDaysAgo.toISOString()
    const cutoffDate = cutoff.slice(0, 10)

    const [commRes, payRes, sommesRes, clientsRes] = await Promise.all([
      supabaseAdmin.from('commissions').select('*, prime:primes(name)').gte('created_at', cutoff),
      supabaseAdmin.from('paiements').select('*, client:clients(name)').gte('date', cutoffDate),
      supabaseAdmin.from('sommes_dues').select('*, client:clients(name)'),
      supabaseAdmin.from('clients').select('id, name'),
    ])

    if (commRes.error || payRes.error || sommesRes.error || clientsRes.error) {
      return NextResponse.json({ insights: [] })
    }

    const dataSummary = {
      commissions: commRes.data,
      paiements: payRes.data,
      sommes_dues: sommesRes.data,
      clients: clientsRes.data,
      period: `90 derniers jours à partir du ${cutoffDate}`,
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ insights: [] })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system:
        'Tu es un analyste business pour LR Consulting W.L.L. Analyse les données fournies et identifie ' +
        'jusqu\'à 3 insights STRICTEMENT actionnables.\n\n' +
        'CRITÈRES DE QUALITÉ (chaque insight DOIT satisfaire les 4) :\n' +
        '1. SPÉCIFIQUE : chiffre précis + nom du client/prime/date exacts (jamais "un paiement", toujours "le paiement de X€ pour le client Y").\n' +
        '2. ACTIONNABLE : l\'action suggérée doit être exécutable immédiatement par l\'utilisateur.\n' +
        '3. NON-TRIVIAL : pas "tout va bien", pas "continuer comme ça", pas "surveiller".\n' +
        '4. FIABLE : si une entité a un client_id null ou des champs manquants, NE PAS générer d\'insight dessus (données incomplètes = silence, pas de spéculation).\n\n' +
        'PRIORITÉS (dans l\'ordre) :\n' +
        '- Retards de paiement critiques avec un client identifié\n' +
        '- Commissions dues depuis plusieurs mois pour un même client\n' +
        '- Sommes_dues à relancer avec client associé\n' +
        '- Opportunités de relance concrètes\n\n' +
        'INTERDICTIONS :\n' +
        '- Ne JAMAIS mentionner un paiement ou une commission sans client_id associé (données incomplètes)\n' +
        '- Ne JAMAIS inventer de dates ou de montants non présents dans les données\n' +
        '- Si aucun insight ne satisfait les 4 critères, retourner un tableau vide\n\n' +
        'Retourne STRICTEMENT via l\'outil return_insights. Titre max 8 mots. Description 1 phrase avec chiffres. ' +
        'actionPrompt doit être un message naturel en français que l\'utilisateur enverrait à Reem AI.',
      tools: [INSIGHTS_TOOL],
      tool_choice: { type: 'tool', name: 'return_insights' },
      messages: [
        {
          role: 'user',
          content: `Voici les données de mon activité sur les 90 derniers jours :\n\n${JSON.stringify(dataSummary, null, 2)}\n\nIdentifie jusqu'à 3 insights actionnables.`,
        },
      ],
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ insights: [] })
    }

    const parsed = toolUse.input as { insights?: Insight[] }
    const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : []

    return NextResponse.json({ insights })
  } catch {
    return NextResponse.json({ insights: [] })
  }
}
