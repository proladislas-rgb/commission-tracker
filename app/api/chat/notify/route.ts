import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const notifySchema = z.object({
  type: z.enum(['mention', 'digest']),
  mentionedUserId: z.string().min(1).optional(),
  senderName: z.string().min(1),
  channelName: z.string().min(1),
  messagePreview: z.string().max(500),
})

// Email mapping — in a real app this would be in the users table
const USER_EMAILS: Record<string, string> = {
  'admin': 'proladislas@gmail.com',     // Hugues-Henri gets notified
  'associe': 'proladislas@gmail.com',    // Ladislas gets notified
}

async function sendNotificationEmail(
  to: string,
  subject: string,
  htmlBody: string,
  request: NextRequest
): Promise<{ ok: boolean; error?: string }> {
  const raw = request.cookies.get('google_tokens')?.value
  if (!raw) return { ok: false, error: 'not_connected' }

  // Use the email send endpoint internally
  const res = await fetch(new URL('/api/email/send', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `google_tokens=${raw}; ${request.cookies.get('ct_session')?.value ? `ct_session=${request.cookies.get('ct_session')?.value}` : ''}`,
    },
    body: JSON.stringify({ to, subject, body: htmlBody }),
  })

  if (res.ok) return { ok: true }
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  return { ok: false, error: data.error ?? `http_${res.status}` }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = notifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
    }

    const { type, mentionedUserId, senderName, channelName, messagePreview } = parsed.data
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://commission-tracker-neon.vercel.app'

    if (type === 'mention' && mentionedUserId) {
      // Get mentioned user's email
      const { data: mentionedUser } = await supabaseAdmin
        .from('users')
        .select('display_name, role')
        .eq('id', mentionedUserId)
        .single()

      if (!mentionedUser) {
        return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 })
      }

      const email = USER_EMAILS[mentionedUser.role]
      if (!email) {
        return NextResponse.json({ ok: true, skipped: 'no_email' })
      }

      const subject = `💬 ${senderName} a mentionné @${mentionedUser.display_name} dans #${channelName}`
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <div style="background:#0f1117;border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.1);">
            <p style="color:#8898aa;font-size:12px;margin:0 0 8px;">
              <strong style="color:#6366f1;">@${escapeHtml(senderName)}</strong> dans <strong>#${escapeHtml(channelName)}</strong>
            </p>
            <p style="color:#e8edf5;font-size:14px;line-height:1.5;margin:0;background:#151a24;border-radius:8px;padding:12px;">
              ${escapeHtml(messagePreview)}
            </p>
            <a href="${appUrl}/dashboard/chat"
               style="display:inline-block;margin-top:16px;background:#6366f1;color:white;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;">
              Ouvrir le chat
            </a>
          </div>
          <p style="color:#3d4f63;font-size:10px;text-align:center;margin-top:12px;">
            Commission Tracker — LR Consulting
          </p>
        </div>
      `

      const result = await sendNotificationEmail(email, subject, html, req)
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'send_failed' }, { status: 502 })
      }
    }

    if (type === 'digest') {
      // Digest: check unread messages for offline users
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, display_name, role, last_seen')

      if (!users) return NextResponse.json({ ok: true })

      for (const u of users) {
        if (u.id === session.id) continue // Don't notify self
        const lastSeen = new Date(u.last_seen).getTime()
        const fiveMinAgo = Date.now() - 5 * 60 * 1000

        if (lastSeen < fiveMinAgo) {
          // User is offline > 5 min — check unread messages
          const { data: unread, count } = await supabaseAdmin
            .from('messages')
            .select('content, user:users(display_name)', { count: 'exact' })
            .gt('created_at', u.last_seen)
            .neq('user_id', u.id)
            .order('created_at', { ascending: false })
            .limit(5)

          if (!count || count === 0) continue

          const email = USER_EMAILS[u.role]
          if (!email) continue

          const subject = `📬 ${count} nouveau${count > 1 ? 'x' : ''} message${count > 1 ? 's' : ''} sur Commission Tracker`
          const messageList = (unread ?? []).map(m => {
            const sender = (m.user as unknown as { display_name: string })?.display_name ?? '??'
            return `<li style="color:#e8edf5;font-size:13px;margin-bottom:6px;">
              <strong style="color:#6366f1;">${escapeHtml(sender)}</strong>: ${escapeHtml((m.content ?? '📎 Fichier').slice(0, 100))}
            </li>`
          }).join('')

          const html = `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;">
              <div style="background:#0f1117;border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.1);">
                <p style="color:#8898aa;font-size:12px;margin:0 0 12px;">
                  ${count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}
                </p>
                <ul style="list-style:none;padding:0;margin:0;background:#151a24;border-radius:8px;padding:12px;">
                  ${messageList}
                </ul>
                <a href="${appUrl}/dashboard/chat"
                   style="display:inline-block;margin-top:16px;background:#6366f1;color:white;text-decoration:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;">
                  Voir les messages
                </a>
              </div>
              <p style="color:#3d4f63;font-size:10px;text-align:center;margin-top:12px;">
                Commission Tracker — LR Consulting
              </p>
            </div>
          `

          const result = await sendNotificationEmail(email, subject, html, req)
          if (!result.ok) {
            console.warn(`[chat/notify] digest mail failed for user ${u.id}:`, result.error)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
