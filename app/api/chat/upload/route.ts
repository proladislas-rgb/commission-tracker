import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const channelId = formData.get('channelId') as string | null

  if (!file || !channelId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 400 })
  }

  // Allowlist des types MIME autorisés (defense in depth)
  // Note : pour une vérification des magic bytes, envisager le package 'file-type' en suivi.
  const ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    // Audio (vocaux) — MediaRecorder peut renvoyer "audio/webm;codecs=opus",
    // d'où la normalisation ci-dessous (split sur ";") avant le check.
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav',
    // Archives
    'application/zip',
  ])
  const baseMime = file.type.split(';')[0].trim().toLowerCase()
  if (!baseMime || !ALLOWED_MIME_TYPES.has(baseMime)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé.' }, { status: 400 })
  }

  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
  const path = `${channelId}/${timestamp}_${sanitizedName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  // On stocke le MIME normalisé (sans params codec) pour éviter qu'un client
  // puisse injecter des params arbitraires dans le Content-Type de réponse CDN.
  const { error: uploadError } = await supabaseAdmin.storage
    .from('chat-files')
    .upload(path, buffer, {
      contentType: baseMime,
    })

  if (uploadError) {
    console.error('[chat/upload] supabase storage error:', uploadError.message)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('chat-files')
    .getPublicUrl(path)

  const fileUrl = urlData.publicUrl

  const { data: message, error: insertError } = await supabaseAdmin
    .from('messages')
    .insert({
      channel_id: channelId,
      user_id: session.id,
      file_url: fileUrl,
      file_name: file.name,
      file_size: String(file.size),
      file_type: baseMime,
    })
    .select('*')
    .single()

  if (insertError) {
    console.error('[chat/upload] supabase insert error:', insertError.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message })
}
