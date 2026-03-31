import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Interdit.' }, { status: 403 })

  const { display_name } = await req.json()
  if (!display_name?.trim()) {
    return NextResponse.json({ error: 'Le nom ne peut pas être vide.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ display_name: display_name.trim() })
    .eq('id', id)
    .select('id, username, display_name, role, avatar_color')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activité
  await supabaseAdmin.from('activity_log').insert({
    user_id:     session.id,
    action:      'update',
    entity_type: 'user',
    entity_id:   id,
    details: { description: `Admin a renommé l'associé en ${display_name.trim()}` },
  })

  return NextResponse.json(data)
}
