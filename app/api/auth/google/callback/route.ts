import { NextRequest, NextResponse } from 'next/server'
import { getGoogleTokens } from '@/lib/google'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard?error=google_auth_failed', request.url)
    )
  }

  try {
    // Vérification CSRF : le nonce dans le state doit correspondre au cookie
    const state = request.nextUrl.searchParams.get('state') ?? ''
    const colonIdx = state.indexOf(':')
    const nonce = colonIdx !== -1 ? state.slice(0, colonIdx) : state
    const redirectFromState = colonIdx !== -1 ? state.slice(colonIdx + 1) : ''
    const storedNonce = request.cookies.get('google_oauth_state')?.value
    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.redirect(
        new URL('/dashboard?error=google_csrf_failed', request.url)
      )
    }

    const tokens = await getGoogleTokens(code)

    const cookieValue = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      expires_at: Date.now() + tokens.expires_in * 1000,
    })

    const redirectPath = redirectFromState.startsWith('/dashboard') ? redirectFromState : '/dashboard/workspace'

    const response = NextResponse.redirect(
      new URL(redirectPath, request.url)
    )

    response.cookies.set('google_tokens', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    })
    // Nettoyer le nonce CSRF après usage
    response.cookies.set('google_oauth_state', '', { maxAge: 0, path: '/' })

    return response
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?error=google_token_exchange_failed', request.url)
    )
  }
}
