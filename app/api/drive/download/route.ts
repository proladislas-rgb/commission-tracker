import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken, type StoredTokens } from '@/lib/google'

const EXPORT_MIMES: Record<string, { mime: string; ext: string }> = {
  'application/vnd.google-apps.document': { mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.spreadsheet': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
  'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: 'pdf' },
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const fileId = request.nextUrl.searchParams.get('fileId')
  if (!fileId) {
    return NextResponse.json({ error: 'fileId requis' }, { status: 400 })
  }

  const raw = request.cookies.get('google_tokens')?.value
  if (!raw) {
    return NextResponse.json({ error: 'not_connected' }, { status: 401 })
  }

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(raw) as StoredTokens
  } catch {
    return NextResponse.json({ error: 'invalid_tokens' }, { status: 401 })
  }

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

  const headers = { Authorization: `Bearer ${tokens.access_token}` }

  // Récupérer les métadonnées du fichier
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
    { headers }
  )

  if (!metaRes.ok) {
    return NextResponse.json({ error: 'file_not_found' }, { status: 404 })
  }

  const meta = (await metaRes.json()) as { name: string; mimeType: string }

  // Fichiers Google natifs → export
  const exportInfo = EXPORT_MIMES[meta.mimeType]
  let downloadUrl: string
  let contentType: string
  let fileName: string

  if (exportInfo) {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportInfo.mime)}`
    contentType = exportInfo.mime
    fileName = `${meta.name}.${exportInfo.ext}`
  } else {
    downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    contentType = meta.mimeType
    fileName = meta.name
  }

  const fileRes = await fetch(downloadUrl, { headers })

  if (!fileRes.ok) {
    return NextResponse.json({ error: 'download_failed' }, { status: 500 })
  }

  const blob = await fileRes.arrayBuffer()

  return new NextResponse(blob, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': String(blob.byteLength),
    },
  })
}
