import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken } from '@/lib/google'

interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

interface DriveAttachment {
  type: 'drive'
  fileId: string
  fileName: string
  mimeType: string
}

interface LocalAttachment {
  type: 'local'
  data: string // base64
  fileName: string
  mimeType: string
}

type Attachment = DriveAttachment | LocalAttachment

interface SendEmailBody {
  to: string
  subject: string
  body: string
  attachments?: Attachment[]
}

const EXPORT_MIMES: Record<string, string> = {
  'application/vnd.google-apps.document': 'application/pdf',
  'application/vnd.google-apps.spreadsheet':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation': 'application/pdf',
}

async function getTokens(request: NextRequest): Promise<{ tokens: StoredTokens } | { error: string; status: number }> {
  const raw = request.cookies.get('google_tokens')?.value
  if (!raw) return { error: 'not_connected', status: 401 }

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(raw) as StoredTokens
  } catch {
    return { error: 'invalid_tokens', status: 401 }
  }

  if (Date.now() > tokens.expires_at) {
    if (!tokens.refresh_token) return { error: 'token_expired', status: 401 }
    try {
      const refreshed = await refreshGoogleToken(tokens.refresh_token)
      tokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
      }
    } catch {
      return { error: 'refresh_failed', status: 401 }
    }
  }

  return { tokens }
}

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function downloadDriveFile(
  fileId: string,
  mimeType: string,
  accessToken: string
): Promise<{ data: string; actualMime: string }> {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const exportMime = EXPORT_MIMES[mimeType]

  let url: string
  let actualMime: string
  if (exportMime) {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`
    actualMime = exportMime
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    actualMime = mimeType
  }

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error('download_failed')

  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return { data: btoa(binary), actualMime }
}

function buildMimeMessage(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: { fileName: string; mimeType: string; base64Data: string }[]
): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const headers = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
  ]

  if (attachments.length === 0) {
    headers.push('Content-Type: text/html; charset=UTF-8')
    headers.push('Content-Transfer-Encoding: base64')
    const encodedBody = btoa(unescape(encodeURIComponent(htmlBody)))
    return headers.join('\r\n') + '\r\n\r\n' + encodedBody
  }

  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)

  let message = headers.join('\r\n') + '\r\n\r\n'

  // HTML body part
  message += `--${boundary}\r\n`
  message += 'Content-Type: text/html; charset=UTF-8\r\n'
  message += 'Content-Transfer-Encoding: base64\r\n\r\n'
  message += btoa(unescape(encodeURIComponent(htmlBody))) + '\r\n'

  // Attachments
  for (const att of attachments) {
    message += `--${boundary}\r\n`
    message += `Content-Type: ${att.mimeType}; name="${att.fileName}"\r\n`
    message += 'Content-Transfer-Encoding: base64\r\n'
    message += `Content-Disposition: attachment; filename="${att.fileName}"\r\n\r\n`
    message += att.base64Data + '\r\n'
  }

  message += `--${boundary}--`
  return message
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const result = await getTokens(request)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const { tokens } = result
  let payload: SendEmailBody
  try {
    payload = (await request.json()) as SendEmailBody
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { to, subject, body: htmlBody, attachments = [] } = payload
  if (!to || !subject || !htmlBody) {
    return NextResponse.json({ error: 'to, subject et body sont requis' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to)) {
    return NextResponse.json({ error: 'Adresse email destinataire invalide.' }, { status: 400 })
  }

  // Préparer les pièces jointes
  const processedAttachments: { fileName: string; mimeType: string; base64Data: string }[] = []

  for (const att of attachments) {
    if (att.type === 'drive') {
      try {
        const { data, actualMime } = await downloadDriveFile(
          att.fileId,
          att.mimeType,
          tokens.access_token
        )
        const ext = EXPORT_MIMES[att.mimeType] ? (att.mimeType.includes('spreadsheet') ? '.xlsx' : '.pdf') : ''
        processedAttachments.push({
          fileName: att.fileName + ext,
          mimeType: actualMime,
          base64Data: data,
        })
      } catch {
        return NextResponse.json(
          { error: `Impossible de télécharger ${att.fileName} depuis Drive` },
          { status: 500 }
        )
      }
    } else {
      processedAttachments.push({
        fileName: att.fileName,
        mimeType: att.mimeType,
        base64Data: att.data,
      })
    }
  }

  const mimeMessage = buildMimeMessage(to, subject, htmlBody, processedAttachments)
  const raw = base64urlFromBytes(new TextEncoder().encode(mimeMessage))

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: 'gmail_send_failed', details: err }, { status: res.status })
  }

  const data = (await res.json()) as { id: string }
  return NextResponse.json({ success: true, messageId: data.id })
}
