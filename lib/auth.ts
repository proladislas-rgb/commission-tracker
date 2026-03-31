import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { AuthUser } from './types'

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'fallback-secret-change-me')
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
