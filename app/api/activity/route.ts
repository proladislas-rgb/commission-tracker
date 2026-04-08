import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const activitySchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  entity_type: z.enum(['commission', 'paiement', 'client', 'user', 'prime', 'somme_due']),
  entity_id: z.string().min(1).max(255),
  details: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = activitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { action, entity_type, entity_id, details } = parsed.data

    const { error } = await supabaseAdmin.from('activity_log').insert({
      user_id: session.id,
      action,
      entity_type,
      entity_id,
      details,
    })

    if (error) {
      console.error('[activity] Supabase error:', error.message)
      return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
}
