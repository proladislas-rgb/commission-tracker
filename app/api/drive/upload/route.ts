import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken } from '@/lib/google'

interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const cookieStore = request.cookies
  const raw = cookieStore.get('google_tokens')?.value

  if (!raw) {
    return NextResponse.json({ error: 'not_connected' }, { status: 401 })
  }

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(raw) as StoredTokens
  } catch {
    return NextResponse.json({ error: 'invalid_tokens' }, { status: 401 })
  }

  // Rafraîchir si expiré
  if (Date.now() > tokens.expires_at) {
    if (!tokens.refresh_token) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    try {
      const refreshed = await refreshGoogleToken(tokens.refresh_token)
      tokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
      }
    } catch {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 401 })
    }
  }

  const folderId = request.nextUrl.searchParams.get('folderId') ?? 'root'

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 })
  }

  const metadata = JSON.stringify({
    name: file.name,
    parents: [folderId],
  })

  const boundary = 'upload_boundary_' + Date.now()
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const bodyParts = [
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadata,
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
  ]

  const prefix = Buffer.from(bodyParts.join(''), 'utf-8')
  const suffix = Buffer.from(`\r\n--${boundary}--`, 'utf-8')
  const body = Buffer.concat([prefix, fileBuffer, suffix])

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!res.ok) {
    const error = await res.text()
    return NextResponse.json({ error: 'upload_failed', details: error }, { status: res.status })
  }

  const uploaded = (await res.json()) as { id: string; name: string }

  const response = NextResponse.json({ success: true, file: { id: uploaded.id, name: uploaded.name } })

  // Mettre à jour le cookie si les tokens ont été rafraîchis
  if (Date.now() < tokens.expires_at - 3500 * 1000) {
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
}
