const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SPREADSHEET_ID = '13SeeG6LgR6k2725VfxkjHpBiQlKbyVXclx_pz05g2-g'

export interface SheetRow {
  date: string
  jour: string
  france: string
  bahrein: string
  autres: string
}

/**
 * Lit une plage du spreadsheet.
 * range format: "2026!A:E"
 */
export async function readSheetRange(
  accessToken: string,
  range: string
): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Sheets API read error: ${error}`)
  }

  const data = (await res.json()) as { values?: string[][] }
  return data.values ?? []
}

/**
 * Écrit une valeur dans une cellule.
 * range format: "2026!C15" (colonne C, ligne 15)
 */
export async function writeSheetCell(
  accessToken: string,
  range: string,
  value: string
): Promise<void> {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Sheets API write error: ${error}`)
  }
}

/**
 * Parse les lignes brutes du sheet en objets structurés.
 * Ignore la première ligne (header).
 * Convention : cellule non vide = présent, vide = absent.
 */
export function parseSheetRows(rows: string[][]): SheetRow[] {
  // Skip header row
  return rows.slice(1).map(row => ({
    date: row[0] ?? '',
    jour: row[1] ?? '',
    france: row[2] ?? '',
    bahrein: row[3] ?? '',
    autres: row[4] ?? '',
  })).filter(r => r.date !== '')
}

/**
 * Détermine la colonne Sheets (C, D, E) pour un type de présence.
 */
export function presenceTypeToColumn(type: 'france' | 'bahrein' | 'autres'): string {
  switch (type) {
    case 'france': return 'C'
    case 'bahrein': return 'D'
    case 'autres': return 'E'
  }
}
