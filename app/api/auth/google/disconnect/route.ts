import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { clearGoogleTokensCookie } from '@/lib/google'

const SAFE_REDIRECT = /^\/[a-zA-Z0-9/_-]*$/

/**
 * POST /api/auth/google/disconnect
 *
 * Purge le cookie google_tokens et renvoie l'URL du consent OAuth.
 *
 * POST (et non GET) pour éviter qu'un `<img>`, `<a>` ou navigation externe
 * puisse déclencher la déconnexion par CSRF. Check Origin supplémentaire
 * pour bloquer les POST cross-site forgés.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origin invalide.' }, { status: 403 })
  }

  let redirectTo = '/dashboard/workspace'
  try {
    const body = (await request.json()) as { redirect?: string }
    if (body.redirect && SAFE_REDIRECT.test(body.redirect)) {
      redirectTo = body.redirect
    }
  } catch {
    // body absent ou invalide → redirectTo par défaut
  }

  const url = new URL(`/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`, request.nextUrl.origin)
  const response = NextResponse.json({ url: url.toString() })
  return clearGoogleTokensCookie(response)
}
