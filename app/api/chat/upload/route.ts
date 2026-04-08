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
    // Audio (vocaux)
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav',
    // Archives
    'application/zip',
  ])
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé.' }, { status: 400 })
  }

  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
  const path = `${channelId}/${timestamp}_${sanitizedName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('chat-files')
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed', details: uploadError.message }, { status: 500 })
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
      file_type: file.type,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'insert_failed', details: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message })
}
