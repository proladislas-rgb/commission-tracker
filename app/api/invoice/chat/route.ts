import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Tu es l'assistant facturation de LR Consulting. Tu génères des factures pour ECODISTRIB.
Quand l'utilisateur te donne des infos de facture, extrais ces variables :
- invoiceNumber : le numéro de facture (ex: N4, N5)
- invoiceDate : la date d'émission (format: "23 December 2025")
- dueDate : la date d'échéance (ou calcule-la si l'utilisateur dit "30 jours")
- paymentTerms : Net 30 days / Net 45 days / Net 60 days
- amount : le montant en euros (un seul chiffre qui va dans Unit Price, Amount, Subtotal et Total)

Réponds TOUJOURS en JSON valide avec ce format exact :
{
  "type": "invoice" ou "message",
  "data": { "invoiceNumber": "...", "invoiceDate": "...", "dueDate": "...", "paymentTerms": "...", "amount": 3000 } si type="invoice",
  "text": "ton message conversationnel"
}

Si l'utilisateur ne donne pas assez d'infos, demande-lui ce qui manque (type="message").
Si l'utilisateur demande de modifier une facture déjà générée, retourne le nouveau JSON complet avec les modifications (type="invoice").
Le champ "text" doit toujours être présent, même quand type="invoice" (pour un message d'accompagnement).
Réponds en français.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as { message: string; history: ChatMessage[] }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message requis.' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API non configurée.' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).map((m: ChatMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const rawText = textBlock ? textBlock.text : ''

    // Extraire le JSON — Claude peut l'entourer de ```json ... ``` ou de ```...```
    let jsonStr = rawText.trim()
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }

    let parsed: { type: string; data?: Record<string, unknown>; text: string }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // Dernier essai : chercher le premier { ... } dans le texte
      const braceMatch = rawText.match(/\{[\s\S]*\}/)
      if (braceMatch) {
        try {
          parsed = JSON.parse(braceMatch[0])
        } catch {
          parsed = { type: 'message', text: rawText }
        }
      } else {
        parsed = { type: 'message', text: rawText }
      }
    }

    return NextResponse.json(parsed)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
