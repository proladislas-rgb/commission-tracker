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
    const tokens = await getGoogleTokens(code)

    const cookieValue = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      expires_at: Date.now() + tokens.expires_in * 1000,
    })

    const state = request.nextUrl.searchParams.get('state')
    const redirectPath = state && state.startsWith('/dashboard') ? state : '/dashboard/workspace'

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

    return response
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?error=google_token_exchange_failed', request.url)
    )
  }
}
