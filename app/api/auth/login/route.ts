import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, getCookieName } from '@/lib/auth'
import type { LoginPayload, AuthUser } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { username, password }: LoginPayload = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Identifiant et mot de passe requis.' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, password_hash, display_name, role, avatar_color')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 })
    }

    // Mettre à jour last_seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id)

    const authUser: AuthUser = {
      id:           user.id,
      username:     user.username,
      display_name: user.display_name,
      role:         user.role,
      avatar_color: user.avatar_color,
    }

    const token = await signToken(authUser)
    const res = NextResponse.json(authUser)
    res.cookies.set(getCookieName(), token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 7,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
