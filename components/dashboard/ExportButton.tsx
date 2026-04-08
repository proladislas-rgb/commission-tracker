'use client'

import { useState, useRef, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Commission, Paiement } from '@/lib/types'

interface ExportButtonProps {
  commissions: Commission[]
  paiements: Paiement[]
  commissionsTotal: number
  encaisse: number
}

export default function ExportButton({ commissions, paiements, commissionsTotal, encaisse }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function handleEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  function handleExportPDF() {
    setOpen(false)
    const caTotal = commissions.reduce((s, c) => s + (Number(c.ca) || 0), 0)
    const restantDu = Math.max(0, commissionsTotal - encaisse)

    const sortedPaiements = [...paiements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const periodeDebut = sortedPaiements.length > 0 ? formatDate(sortedPaiements[0].date) : '—'
    const periodeFin = formatDate(new Date().toISOString())

    const paiementRows = sortedPaiements.map(p => {
      const statusLabel = p.status === 'effectue' ? 'Effectué' : p.status === 'en_attente' ? 'En attente' : 'En retard'
      const statusColor = p.status === 'effectue' ? '#22c55e' : p.status === 'en_attente' ? '#f59e0b' : '#f43f5e'
      return `<tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb">${formatDate(p.date)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb">${p.label}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;font-weight:600">${formatCurrency(Number(p.montant))}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb"><span style="background:${statusColor}18;color:${statusColor};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${statusLabel}</span></td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Récapitulatif Commissions — LR Consulting</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1e293b; background:#fff; padding:40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:24px; border-bottom:2px solid #6366f1; }
  .logo { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:20px; font-weight:700; color:#6366f1; }
  .logo-sub { font-size:12px; color:#64748b; margin-top:4px; }
  .meta { text-align:right; font-size:13px; color:#64748b; }
  .meta strong { color:#1e293b; }
  h1 { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:22px; font-weight:700; margin-bottom:6px; color:#0f172a; }
  .subtitle { font-size:14px; color:#64748b; margin-bottom:28px; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
  .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; position:relative; overflow:hidden; }
  .kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
  .kpi-violet::before { background:linear-gradient(90deg,#6366f1,#818cf8); }
  .kpi-amber::before { background:linear-gradient(90deg,#f59e0b,#d97706); }
  .kpi-green::before { background:linear-gradient(90deg,#22c55e,#16a34a); }
  .kpi-rose::before { background:linear-gradient(90deg,#f43f5e,#e11d48); }
  .kpi-label { font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; margin-bottom:6px; }
  .kpi-value { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:22px; font-weight:700; color:#0f172a; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  thead th { padding:10px 14px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; color:#64748b; font-weight:600; background:#f8fafc; border-bottom:2px solid #e2e8f0; }
  thead th:nth-child(3) { text-align:right; }
  .totals { display:flex; justify-content:flex-end; gap:32px; padding:16px 0; border-top:2px solid #6366f1; margin-top:8px; }
  .total-item { text-align:right; }
  .total-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; }
  .total-value { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:20px; font-weight:700; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center; }
  @media print { body { padding:20px; } .kpis { gap:10px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">LR Consulting W.L.L</div>
      <div class="logo-sub">Bldg. 40, Road 1701, Block 317, Diplomatic Area, Kingdom of Bahrain</div>
    </div>
    <div class="meta">
      <div>Généré le <strong>${periodeFin}</strong></div>
      <div>C.R. Number: 190710 - 1</div>
    </div>
  </div>

  <h1>Récapitulatif des commissions</h1>
  <div class="subtitle">Client : <strong>ECODISTRIB</strong> — Période : ${periodeDebut} → ${periodeFin}</div>

  <div class="kpis">
    <div class="kpi kpi-violet"><div class="kpi-label">CA Total</div><div class="kpi-value">${formatCurrency(caTotal)}</div></div>
    <div class="kpi kpi-amber"><div class="kpi-label">Commissions</div><div class="kpi-value">${formatCurrency(commissionsTotal)}</div></div>
    <div class="kpi kpi-green"><div class="kpi-label">Encaissé</div><div class="kpi-value">${formatCurrency(encaisse)}</div></div>
    <div class="kpi kpi-rose"><div class="kpi-label">Restant dû</div><div class="kpi-value">${formatCurrency(restantDu)}</div></div>
  </div>

  <table>
    <thead><tr><th>Date</th><th>Libellé</th><th>Montant</th><th>Statut</th></tr></thead>
    <tbody>${paiementRows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8">Aucun paiement</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="total-item"><div class="total-label">Total encaissé</div><div class="total-value" style="color:#22c55e">${formatCurrency(encaisse)}</div></div>
    <div class="total-item"><div class="total-label">Solde restant dû</div><div class="total-value" style="color:#f43f5e">${formatCurrency(restantDu)}</div></div>
  </div>

  <div class="footer">LR Consulting W.L.L — proladislas@gmail.com — +973 3400 8825 — Al Salam Bank, IBAN BH32ALSA00387049100101</div>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  async function handleExportXLSX() {
    setOpen(false)
    const XLSX = (await import('xlsx')).default

    // --- Commissions sheet ---
    const commissionData = commissions.map(c => ({
      'Prime': c.prime?.name ?? String(c.prime_id),
      'CA': Number(c.ca) || 0,
      'Commission': Number(c.commission) || 0,
      'Dossiers': Number(c.dossiers) || 0,
      'Mois': c.mois,
      'Statut': c.status === 'due' ? 'Dû' : c.status === 'partiel' ? 'Partiel' : 'Payé',
    }))

    const caTotal = commissions.reduce((s, c) => s + (Number(c.ca) || 0), 0)
    const commTotal = commissions.reduce((s, c) => s + (Number(c.commission) || 0), 0)
    const dossiersTotal = commissions.reduce((s, c) => s + (Number(c.dossiers) || 0), 0)

    commissionData.push({
      'Prime': 'TOTAL',
      'CA': caTotal,
      'Commission': commTotal,
      'Dossiers': dossiersTotal,
      'Mois': '',
      'Statut': '',
    })

    const wsCommissions = XLSX.utils.json_to_sheet(commissionData)

    // --- Paiements sheet ---
    const paiementData = paiements.map(p => ({
      'Date': p.date,
      'Libellé': p.label,
      'Montant': Number(p.montant) || 0,
      'Statut': p.status === 'effectue' ? 'Effectué' : p.status === 'en_attente' ? 'En attente' : 'En retard',
    }))

    const montantTotal = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0)

    paiementData.push({
      'Date': 'TOTAL',
      'Libellé': '',
      'Montant': montantTotal,
      'Statut': '',
    })

    const wsPaiements = XLSX.utils.json_to_sheet(paiementData)

    // --- Workbook ---
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsCommissions, 'Commissions')
    XLSX.utils.book_append_sheet(wb, wsPaiements, 'Paiements')

    XLSX.writeFile(wb, `commission_tracker_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function handleExportCSV() {
    setOpen(false)
    const BOM = '\uFEFF'
    const header = 'Date,Libellé,Prime,CA,Commission,Montant,Statut'

    const commissionRows = commissions.map(c => {
      const primeName = c.prime?.name ?? c.prime_id
      const status = c.status === 'due' ? 'Dû' : c.status === 'partiel' ? 'Partiel' : 'Payé'
      return `${c.mois},"${primeName}","${primeName}",${Number(c.ca) || 0},${Number(c.commission) || 0},,${status}`
    })

    const paiementRows = paiements.map(p => {
      const status = p.status === 'effectue' ? 'Effectué' : p.status === 'en_attente' ? 'En attente' : 'En retard'
      return `${p.date},"${p.label}",,,,${Number(p.montant) || 0},${status}`
    })

    const csv = BOM + header + '\n' + commissionRows.join('\n') + '\n' + paiementRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commission_tracker_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors duration-200 flex items-center gap-1.5"
        style={{
          background: 'rgba(56,189,248,0.1)',
          border: '1px solid rgba(56,189,248,0.15)',
          color: '#38bdf8',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exporter
      </button>

      <div
        className="absolute right-0 top-full mt-2"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
          zIndex: 50,
          background: '#151a24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '8px',
          minWidth: '200px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={handleExportPDF}
          className="w-full flex items-center gap-3 rounded-[8px] cursor-pointer transition-colors duration-200 text-left"
          style={{ padding: '10px 14px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-txt">Rapport PDF</div>
            <div className="text-[11px] text-txt3">Récapitulatif complet</div>
          </div>
        </button>

        <button
          onClick={handleExportXLSX}
          className="w-full flex items-center gap-3 rounded-[8px] cursor-pointer transition-colors duration-200 text-left"
          style={{ padding: '10px 14px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-txt">Excel (.xlsx)</div>
            <div className="text-[11px] text-txt3">Classeur multi-feuilles</div>
          </div>
        </button>

        <button
          onClick={handleExportCSV}
          className="w-full flex items-center gap-3 rounded-[8px] cursor-pointer transition-colors duration-200 text-left"
          style={{ padding: '10px 14px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="10" y1="12" x2="10" y2="18" />
              <line x1="14" y1="12" x2="14" y2="18" />
              <line x1="8" y1="15" x2="16" y2="15" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-txt">CSV</div>
            <div className="text-[11px] text-txt3">Données brutes</div>
          </div>
        </button>
      </div>
    </div>
  )
}
