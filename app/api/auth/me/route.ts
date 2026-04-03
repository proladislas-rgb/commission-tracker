import { NextResponse } from 'next/server'
import { getSessionUser, getCookieName } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(getCookieName(), '', { maxAge: 0, path: '/' })
    return res
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
