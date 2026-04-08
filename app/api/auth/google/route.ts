import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthURL } from '@/lib/google'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const redirect = request.nextUrl.searchParams.get('redirect') ?? '/dashboard/workspace'
    // CSRF : on génère un nonce aléatoire stocké en cookie httpOnly
    const nonce = crypto.randomUUID()
    const state = `${nonce}:${redirect}`
    const baseUrl = getGoogleAuthURL()
    const url = `${baseUrl}&state=${encodeURIComponent(state)}`
    const response = NextResponse.redirect(url)
    response.cookies.set('google_oauth_state', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la redirection Google.' }, { status: 500 })
  }
}
