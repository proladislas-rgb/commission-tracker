import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { AuthUser } from './types'

// Durant la phase build Next.js, les env vars peuvent manquer. On skip le
// throw dans ce cas et on utilise un placeholder qui ne sera jamais utilisé
// pour signer/vérifier à ce moment-là. En runtime, on throw immédiatement
// si AUTH_SECRET manque.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
const authSecret = process.env.AUTH_SECRET
if (!isBuildPhase && !authSecret) {
  throw new Error('AUTH_SECRET environment variable is required. Configure it in .env.local')
}
const SECRET = new TextEncoder().encode(authSecret || 'build-phase-placeholder')

const COOKIE_NAME = 'ct_session'

// JWT expiry réduit à 1j (audit sécurité 2026-04-08 : était 7j)
export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
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
