import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL('/api/auth/google?redirect=/dashboard/workspace', request.url)
  const response = NextResponse.redirect(url)
  response.cookies.set('google_tokens', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
