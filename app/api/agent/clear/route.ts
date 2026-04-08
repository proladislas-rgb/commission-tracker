import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('agent_messages')
    .delete()
    .eq('user_id', session.id)

  if (error) {
    console.error('[agent/clear] Supabase error:', error.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
