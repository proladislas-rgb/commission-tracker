import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { AGENT_TOOLS, executeAgentTool } from '@/lib/agent-tools'

const SYSTEM_PROMPT =
  'Tu es Reem AI, l\'assistante intelligente de LR Consulting W.L.L, basée au Royaume de Bahreïn. ' +
  'Tu parles toujours en français. Tu peux interroger les données, créer des commissions/paiements ' +
  '(avec confirmation), chercher dans Drive, composer des emails, et discuter librement. ' +
  'Utilise le format français pour les chiffres (espaces, €). Sois concise et professionnelle.'

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  clientId: z.string().nullable().optional().default(null),
})

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

    const { message, clientId } = parsed.data

    // Save user message
    await supabaseAdmin.from('agent_messages').insert({
      user_id: session.id,
      role: 'user',
      content: message,
    })

    // Load conversation history
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

    // Google access token from cookies
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
    const context = { clientId, userId: session.id, googleAccessToken }

    // Initial call
    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages,
    })

    // Collect tool data for the frontend
    const toolData: Array<{ tool: string; type: string; result: unknown }> = []

    // Tool use loop
    while (response.stop_reason === 'tool_use') {
      const assistantContent = response.content
      const toolUseBlocks = assistantContent.filter(
        (b) => b.type === 'tool_use',
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue
        try {
          const result = await executeAgentTool(block.name, block.input as Record<string, unknown>, context)
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
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages,
      })
    }

    // Extract text content
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    )
    const content = textBlocks.map((b) => b.text).join('\n')

    // Save assistant response
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
