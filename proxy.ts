import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getCookieName } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get(getCookieName())?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
