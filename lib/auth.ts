import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { AuthUser } from './types'

const authSecret = process.env.AUTH_SECRET
if (!authSecret && typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET doit être défini en production')
}
const SECRET = new TextEncoder().encode(authSecret ?? 'dev-only-fallback-secret-not-for-prod')
const COOKIE_NAME = 'ct_session'

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
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
