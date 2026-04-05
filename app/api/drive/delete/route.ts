import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken } from '@/lib/google'

interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

  const fileId = request.nextUrl.searchParams.get('fileId')
  if (!fileId) {
    return NextResponse.json({ error: 'missing_file_id' }, { status: 400 })
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }
  )

  if (!res.ok) {
    const error = await res.text()
    return NextResponse.json({ error: 'delete_failed', details: error }, { status: res.status })
  }

  const response = NextResponse.json({ success: true })

  // Mettre à jour le cookie si les tokens ont été rafraîchis
  if (Date.now() < tokens.expires_at - 3500 * 1000) {
    // tokens were just refreshed
  } else {
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
