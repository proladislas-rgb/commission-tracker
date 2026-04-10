import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessionUser } from '@/lib/auth'
import { refreshGoogleToken, type StoredTokens } from '@/lib/google'
import {
  readSheetRange,
  writeSheetCell,
  parseSheetRows,
  presenceTypeToColumn,
} from '@/lib/sheets'
import type { PresenceDay, PresenceType } from '@/lib/types'

/** Résout les tokens Google depuis les cookies, refresh si expiré. */
async function resolveTokens(
  request: NextRequest
): Promise<{ tokens: StoredTokens; wasRefreshed: boolean } | NextResponse> {
  const raw = request.cookies.get('google_tokens')?.value
  if (!raw) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  let tokens: StoredTokens
  try {
    tokens = JSON.parse(raw) as StoredTokens
  } catch {
    return NextResponse.json({ error: 'invalid_tokens' }, { status: 401 })
  }

  let wasRefreshed = false
  if (Date.now() > tokens.expires_at) {
    if (!tokens.refresh_token) {
      return NextResponse.json({ error: 'token_expired' }, { status: 401 })
    }
    try {
      const refreshed = await refreshGoogleToken(tokens.refresh_token)
      tokens = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
      }
      wasRefreshed = true
    } catch {
      return NextResponse.json({ error: 'refresh_failed' }, { status: 401 })
    }
  }
  return { tokens, wasRefreshed }
}

function setCookieIfRefreshed(
  response: NextResponse,
  tokens: StoredTokens,
  wasRefreshed: boolean
): NextResponse {
  if (wasRefreshed) {
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return response
}

function sheetRowToPresenceType(row: { france: string; bahrein: string; autres: string }): PresenceType {
  if (row.france.trim()) return 'france'
  if (row.bahrein.trim()) return 'bahrein'
  if (row.autres.trim()) return 'autres'
  return null
}

/**
 * GET /api/sheets/presence?year=2026
 * Retourne toutes les présences de l'année.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const year = request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear())
  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
  }

  const result = await resolveTokens(request)
  if (result instanceof NextResponse) return result
  const { tokens, wasRefreshed } = result

  try {
    const rows = await readSheetRange(tokens.access_token, `${year}!A:E`)
    const parsed = parseSheetRows(rows)

    const days: PresenceDay[] = parsed.map(row => ({
      date: row.date,
      jour: row.jour,
      presence: sheetRowToPresenceType(row),
    }))

    const response = NextResponse.json({ year: Number(year), days })
    return setCookieIfRefreshed(response, tokens, wasRefreshed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Sheets API'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

const PutPresenceSchema = z.object({
  year: z.number().int().min(2025).max(2028),
  rowIndex: z.number().int().min(0),
  presence: z.enum(['france', 'bahrein', 'autres']).nullable(),
})

/**
 * PUT /api/sheets/presence
 * Body: { year: 2026, rowIndex: 15, presence: "france" | "bahrein" | "autres" | null }
 * rowIndex = index 0-based dans le tableau (hors header), donc row Sheets = rowIndex + 2
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const raw = await request.json().catch(() => null)
  const parsed = PutPresenceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  const { year, rowIndex, presence } = parsed.data

  const result = await resolveTokens(request)
  if (result instanceof NextResponse) return result
  const { tokens, wasRefreshed } = result

  // Row in sheet = rowIndex + 2 (1-indexed + skip header)
  const sheetRow = rowIndex + 2

  try {
    // Clear all 3 columns first
    await Promise.all([
      writeSheetCell(tokens.access_token, `${year}!C${sheetRow}`, ''),
      writeSheetCell(tokens.access_token, `${year}!D${sheetRow}`, ''),
      writeSheetCell(tokens.access_token, `${year}!E${sheetRow}`, ''),
    ])

    // Set the selected column if not null
    if (presence) {
      const col = presenceTypeToColumn(presence)
      await writeSheetCell(tokens.access_token, `${year}!${col}${sheetRow}`, 'X')
    }

    const response = NextResponse.json({ ok: true })
    return setCookieIfRefreshed(response, tokens, wasRefreshed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur Sheets API'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
