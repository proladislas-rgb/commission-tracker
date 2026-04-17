import type { NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI =
  (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000') +
  '/api/auth/google/callback'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets',
]

/** Codes d'erreur renvoyés par les routes Google en 401 = OAuth doit être reconnecté. */
export const OAUTH_ERROR_CODES = new Set([
  'not_connected',
  'invalid_tokens',
  'token_expired',
  'refresh_failed',
])

export function isOAuthError(code: string | null | undefined): boolean {
  return code !== null && code !== undefined && OAUTH_ERROR_CODES.has(code)
}

/** Purge le cookie google_tokens dans la réponse. Appeler quand on détecte un refresh invalide. */
export function clearGoogleTokensCookie(response: NextResponse): NextResponse {
  response.cookies.set('google_tokens', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

/** Tokens Google persistés dans le cookie httpOnly `google_tokens`. */
export interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export function getGoogleAuthURL(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function getGoogleTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Échec échange token Google : ${error}`)
  }

  return res.json() as Promise<GoogleTokens>
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Échec rafraîchissement token Google : ${error}`)
  }

  return res.json() as Promise<GoogleTokens>
}

