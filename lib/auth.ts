import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { AuthUser } from './types'

// Lazy init : on ne crash pas au module load pour laisser Next.js faire sa phase
// "Collecting page data" pendant le build Vercel. Au runtime, la toute première
// utilisation (signToken ou verifyToken) throw si AUTH_SECRET manque.
let _secret: Uint8Array | null = null
function getSecret(): Uint8Array {
  if (_secret) return _secret
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    throw new Error('AUTH_SECRET environment variable is required. Configure it in .env.local')
  }
  _secret = new TextEncoder().encode(authSecret)
  return _secret
}

const COOKIE_NAME = 'ct_session'

// JWT expiry réduit à 1j (audit sécurité 2026-04-08 : était 7j)
export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return (payload.user as AuthUser) ?? null
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function getCookieName(): string {
  return COOKIE_NAME
}
