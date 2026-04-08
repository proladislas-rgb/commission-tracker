import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { signToken, getCookieName } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import type { RegisterPayload, AuthUser, Role } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    // Rate limit : 3 tentatives / heure par IP
    const { allowed, resetAt } = rateLimit(`register:${getClientIp(req)}`, 3, 60 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      )
    }

    const body: RegisterPayload = await req.json()
    const { username, password, displayName, avatarColor } = body

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 })
    }

    // Vérifier si c'est le premier compte
    // Risque de race condition accepté pour un outil interne à 2 utilisateurs
    // (l'inscription n'est pas une action quotidienne). Mitigation : re-vérification post-insert.
    const { count: beforeCount } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })

    const role: Role = (beforeCount === 0 || beforeCount === null) ? 'admin' : 'associe'

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

    // Double-check : si on vient d'insérer un admin, vérifier qu'il n'en existe pas un autre
    if (role === 'admin') {
      const { count: adminCount } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
      if ((adminCount ?? 0) > 1) {
        // Race détectée — rétrograder en associé
        await supabaseAdmin.from('users').update({ role: 'associe' }).eq('id', user.id)
        user.role = 'associe'
      }
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
  } catch (err) {
    console.error('[auth/register] Erreur serveur:', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
