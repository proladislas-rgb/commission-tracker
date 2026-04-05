import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
  const userId = formData.get('userId') as string | null

  if (!file || !channelId || !userId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 400 })
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Type de fichier non autorisé.' }, { status: 400 })
  }

  const timestamp = Date.now()
  const path = `${channelId}/${timestamp}_${file.name}`

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
      user_id: userId,
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
