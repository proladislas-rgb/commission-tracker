import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken, type StoredTokens } from '@/lib/google'
import type { DriveFile } from '@/lib/drive'

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const rawFolderId = request.nextUrl.searchParams.get('folderId') ?? 'root'
  const folderId = rawFolderId === 'root' ? 'root' : rawFolderId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!folderId) return NextResponse.json({ error: 'folderId invalide' }, { status: 400 })
  const q = `'${folderId}' in parents and trashed = false`

  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,modifiedTime,size,parents,iconLink,thumbnailLink)',
    orderBy: 'folder,modifiedTime desc',
    pageSize: '50',
  })

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )

  if (!res.ok) {
    const error = await res.text()
    return NextResponse.json({ error: 'drive_error', details: error }, { status: res.status })
  }

  const data = (await res.json()) as { files: DriveFile[] }
  const allFiles = data.files ?? []

  const folders = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder')
  const files = allFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder')

  const response = NextResponse.json({ folders, files })

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
