import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const confirmSchema = z.object({
  action: z.enum(['create_commission', 'create_paiement']),
  data: z.record(z.string(), z.unknown()),
})

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = confirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.', details: parsed.error.flatten() }, { status: 400 })
    }

    const { action, data } = parsed.data

    if (action === 'create_commission') {
      const row = {
        prime_id: String(data.prime_id ?? ''),
        user_id: String(data.user_id ?? session.id),
        ca: Number(data.ca) || 0,
        commission: Number(data.commission) || 0,
        dossiers: Number(data.dossiers) || 0,
        mois: String(data.mois ?? ''),
        status: String(data.status ?? 'due'),
        client_id: data.client_id ? String(data.client_id) : null,
        created_by: session.id,
      }

      const { data: inserted, error } = await supabaseAdmin
        .from('commissions')
        .insert(row)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await supabaseAdmin.from('activity_log').insert({
        user_id: session.id,
        action: 'create',
        entity_type: 'commission',
        entity_id: inserted.id,
        details: { source: 'via Reem AI', description: `Commission créée via Reem AI — ${String(data.prime_name ?? '')} ${row.mois}` },
      })

      return NextResponse.json({ success: true, record: inserted })
    }

    if (action === 'create_paiement') {
      const row = {
        date: String(data.date ?? ''),
        montant: Number(data.montant) || 0,
        label: String(data.label ?? ''),
        status: String(data.status ?? 'en_attente'),
        client_id: data.client_id ? String(data.client_id) : null,
        created_by: session.id,
      }

      const { data: inserted, error } = await supabaseAdmin
        .from('paiements')
        .insert(row)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await supabaseAdmin.from('activity_log').insert({
        user_id: session.id,
        action: 'create',
        entity_type: 'paiement',
        entity_id: inserted.id,
        details: { source: 'via Reem AI', description: `Paiement créé via Reem AI — ${row.label} ${row.montant} €` },
      })

      return NextResponse.json({ success: true, record: inserted })
    }

    return NextResponse.json({ error: 'Action non supportée.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
}
