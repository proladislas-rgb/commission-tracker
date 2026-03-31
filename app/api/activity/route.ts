import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { action, entity_type, entity_id, details } = await req.json()

  const { error } = await supabaseAdmin.from('activity_log').insert({
    user_id: session.id,
    action,
    entity_type,
    entity_id,
    details,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
