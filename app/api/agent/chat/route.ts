import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { AGENT_TOOLS, executeAgentTool } from '@/lib/agent-tools'
import type { ReemContext } from '@/lib/reem-types'

const BASE_SYSTEM_PROMPT =
  'Tu es Reem AI, l\'assistante intelligente de LR Consulting W.L.L, basée au Royaume de Bahreïn. ' +
  'Tu parles toujours en français. Tu peux interroger les données (query_data), identifier les retards de paiement ' +
  '(get_overdue_payments), synthétiser une période (summarize_period), chercher dans Google Drive, rédiger des brouillons ' +
  'd\'email (draft_email) qui s\'ouvriront dans le tiroir Workspace de l\'utilisateur, et proposer des liens de navigation ' +
  '(propose_navigation) que l\'utilisateur clique lui-même. ' +
  '\n\n' +
  'IMPORTANT : tu ne peux PAS créer, modifier ou supprimer de données directement (pas de tools d\'écriture en V1). ' +
  'Quand tu veux aider l\'utilisateur à créer une commission ou un paiement, propose-lui un lien vers la page correspondante ' +
  'via propose_navigation et laisse-le faire lui-même. Pour rédiger un email, utilise draft_email qui ouvrira ' +
  'le tiroir du Workspace pré-rempli. ' +
  '\n\n' +
  'Utilise le format français pour les chiffres (espaces, €). Sois concise et professionnelle.'

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  context: z.object({
    pathname: z.string(),
    pageLabel: z.string(),
    activeClientId: z.string().nullable(),
    selectedEntity: z.object({
      type: z.enum(['client', 'commission', 'paiement', 'invoice', 'email_draft']),
      id: z.string().optional(),
      preview: z.string().optional(),
    }).optional(),
  }).optional(),
})

function buildSystemPrompt(context?: ReemContext): string {
  if (!context) return BASE_SYSTEM_PROMPT
  const lines = [
    BASE_SYSTEM_PROMPT,
    '',
    'Contexte utilisateur courant :',
    `- Page : ${context.pageLabel} (${context.pathname})`,
    context.activeClientId
      ? `- Client actif : ${context.activeClientId}`
      : '- Client actif : aucun',
  ]
  if (context.selectedEntity) {
    lines.push(`- Entité en cours : ${context.selectedEntity.type}${context.selectedEntity.preview ? ` — ${context.selectedEntity.preview}` : ''}`)
  }
  lines.push('')
  lines.push('Prends ce contexte en compte. Quand l\'utilisateur dit "ce client", "cette facture", "ce mail", réfère-toi à l\'entité en cours.')
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { message, context } = parsed.data

    await supabaseAdmin.from('agent_messages').insert({
      user_id: session.id,
      role: 'user',
      content: message,
    })

    const { data: history } = await supabaseAdmin
      .from('agent_messages')
      .select('role, content, tool_data')
      .eq('user_id', session.id)
      .order('created_at', { ascending: true })
      .limit(30)

    const messages: Anthropic.MessageParam[] = (history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    let googleAccessToken: string | null = null
    try {
      const cookieHeader = req.headers.get('cookie') ?? ''
      const match = cookieHeader.match(/google_tokens=([^;]+)/)
      if (match) {
        const tokens = JSON.parse(decodeURIComponent(match[1])) as { access_token?: string }
        googleAccessToken = tokens.access_token ?? null
      }
    } catch {
      // No Google tokens available
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API Anthropic non configurée.' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })
    const agentContext = {
      clientId: context?.activeClientId ?? null,
      userId: session.id,
      googleAccessToken,
      pageContext: context,
    }

    const systemPrompt = buildSystemPrompt(context)

    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    })

    const toolData: Array<{ tool: string; type: string; result: unknown }> = []

    while (response.stop_reason === 'tool_use') {
      const assistantContent = response.content
      const toolUseBlocks = assistantContent.filter((b) => b.type === 'tool_use')

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue
        try {
          const result = await executeAgentTool(block.name, block.input as Record<string, unknown>, agentContext)
          toolData.push({ tool: block.name, type: result.type, result: result.result })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Erreur inconnue'
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: errMsg }),
            is_error: true,
          })
        }
      }

      messages.push({ role: 'assistant', content: assistantContent })
      messages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools: AGENT_TOOLS,
        messages,
      })
    }

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    )
    const content = textBlocks.map((b) => b.text).join('\n')

    await supabaseAdmin.from('agent_messages').insert({
      user_id: session.id,
      role: 'assistant',
      content,
      tool_data: toolData.length > 0 ? toolData : null,
    })

    return NextResponse.json({ content, tool_data: toolData })
  } catch {
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
