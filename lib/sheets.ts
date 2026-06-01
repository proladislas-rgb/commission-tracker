const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SPREADSHEET_ID = '13SeeG6LgR6k2725VfxkjHpBiQlKbyVXclx_pz05g2-g'

export interface SheetRow {
  date: string
  jour: string
  france: string
  bahrein: string
  autres: string
  /** Numéro de ligne 1-based dans le Google Sheet (pour écriture) */
  sheetRow: number
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
 * Écrit une plage de valeurs en un seul appel API.
 * range format: "2026!C15:E15" (cellule simple "C15" ou range "C15:E15")
 * values: tableau 2D row-major. Pour 1 cellule: [["val"]]. Pour 1 ligne 3 colonnes: [["a","b","c"]].
 *
 * Batcher en un seul appel est critique pour respecter le quota Google Sheets
 * (60 writes/min/user). Toujours préférer une range à plusieurs writes successifs.
 */
export async function writeSheetRange(
  accessToken: string,
  range: string,
  values: string[][]
): Promise<void> {
  const url = `${SHEETS_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Sheets API write error: ${error}`)
  }
}

/** Vérifie qu'une chaîne ressemble à une date DD/MM/YYYY */
function isDateStr(s: string): boolean {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s.trim())
}

/**
 * Parse les lignes brutes du sheet en objets structurés.
 * Ignore toutes les lignes qui ne commencent pas par une date valide
 * (titre, sous-titre, compteurs, lignes vides).
 * Les checkboxes Google Sheets renvoient "TRUE"/"FALSE".
 */
export function parseSheetRows(rows: string[][]): SheetRow[] {
  const result: SheetRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row[0] && isDateStr(row[0])) {
      result.push({
        date: row[0],
        jour: row[1] ?? '',
        france: row[2] ?? '',
        bahrein: row[3] ?? '',
        autres: row[4] ?? '',
        sheetRow: i + 1, // 1-based row number in the sheet
      })
    }
  }
  return result
}

