import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }
  return NextResponse.json(user)
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('ct_session', '', { maxAge: 0, path: '/' })
  return res
}
