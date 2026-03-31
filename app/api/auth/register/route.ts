import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, getCookieName } from '@/lib/auth'
import type { RegisterPayload, AuthUser, Role } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body: RegisterPayload = await req.json()
    const { username, password, displayName, avatarColor } = body

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
    }

    // Vérifier si c'est le premier compte
    const { count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    const role: Role = (count ?? 0) === 0 ? 'admin' : 'associe'

    const password_hash = await bcrypt.hash(password, 10)

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        username: username.trim().toLowerCase(),
        password_hash,
        display_name: displayName.trim(),
        role,
        avatar_color: avatarColor ?? '#6366f1',
      })
      .select('id, username, display_name, role, avatar_color, created_at, last_seen')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const authUser: AuthUser = {
      id:           user.id,
      username:     user.username,
      display_name: user.display_name,
      role:         user.role,
      avatar_color: user.avatar_color,
    }

    const token = await signToken(authUser)
    const res = NextResponse.json(authUser, { status: 201 })
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
