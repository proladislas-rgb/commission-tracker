'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useClientContext } from '@/hooks/useClientContext'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import type { InvoiceData } from '@/lib/invoice-template'
import { generateInvoiceHTML } from '@/lib/invoice-template'
import { formatEuro } from '@/lib/format-invoice'

interface InvoicePreviewProps {
  data: InvoiceData
  associeId: string | null
  onModify: () => void
  onInjected?: (message: string) => void
}

export default function InvoicePreview({ data, associeId, onModify, onInjected }: InvoicePreviewProps) {
  const { user } = useAuth()
  const { selectedClientId } = useClientContext()
  const { toast } = useToast()
  const [injecting, setInjecting] = useState(false)
  const [injected, setInjected] = useState(false)
  const [showInjectForm, setShowInjectForm] = useState(false)
  const [injectLabel, setInjectLabel] = useState('')

  function handleDownloadPDF() {
    const html = generateInvoiceHTML(data)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  async function handleInjectPaiement() {
    if (!user || injecting || injected) return
    setInjecting(true)
    try {
      // created_by doit être l'associé pour que le dashboard affiche le paiement
      const createdBy = associeId ?? user.id
      // Parser la date (format "23 December 2025" ou ISO)
      let dateStr: string
      const parsed = new Date(data.dueDate)
      if (!isNaN(parsed.getTime())) {
        dateStr = parsed.toISOString().split('T')[0]
      } else {
        // Fallback: date du jour
        dateStr = new Date().toISOString().split('T')[0]
      }
      const { error } = await supabase.from('paiements').insert({
        date: dateStr,
        montant: Number(data.amount),
        label: injectLabel.trim() || `Facture #${data.invoiceNumber}`,
        status: 'en_attente',
        created_by: createdBy,
        client_id: selectedClientId,
      })
      if (error) throw new Error(error.message)
      setInjected(true)
      onInjected?.(`Paiement injecté : ${data.dueDate} — ${formatEuro(data.amount)} — En attente`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('[invoice/inject]', err)
      toast(`Échec de l'injection du paiement : ${msg}`, 'error')
    } finally {
      setInjecting(false)
    }
  }

  return (
    <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: '#151a24', border: '1px solid rgba(255,255,255,0.12)' }}>
      {/* En-tête carte */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-sm font-semibold text-txt">Facture #{data.invoiceNumber}</span>
        </div>
        <span className="text-xs text-txt3">LR Consulting → ECODISTRIB</span>
      </div>

      {/* Détails */}
      <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
        <div>
          <span className="text-txt3">Date d&apos;émission</span>
          <p className="text-txt2 font-medium">{data.invoiceDate}</p>
        </div>
        <div>
          <span className="text-txt3">Date d&apos;échéance</span>
          <p className="text-txt2 font-medium">{data.dueDate}</p>
        </div>
        <div>
          <span className="text-txt3">Conditions</span>
          <p className="text-txt2 font-medium">{data.paymentTerms}</p>
        </div>
        <div>
          <span className="text-txt3">Montant total</span>
          <p className="text-lg font-bold text-indigo">{formatEuro(data.amount)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-border flex gap-2 flex-wrap">
        <button
          onClick={handleDownloadPDF}
          className="px-3 py-1.5 rounded-btn text-xs font-medium bg-indigo text-white hover:bg-indigo/80 transition-colors cursor-pointer"
        >
          Télécharger PDF
        </button>
        <button
          onClick={onModify}
          className="px-3 py-1.5 rounded-btn text-xs font-medium border border-[rgba(255,255,255,0.12)] text-txt2 hover:text-txt hover:bg-raised transition-colors cursor-pointer"
        >
          Modifier
        </button>
        {!injected && !showInjectForm && (
          <button
            onClick={() => { setInjectLabel(`Facture #${data.invoiceNumber}`); setShowInjectForm(true) }}
            className="px-3 py-1.5 rounded-btn text-xs font-medium bg-amber/15 text-amber border border-amber/30 hover:bg-amber/25 transition-colors cursor-pointer"
          >
            Valider et injecter dans les paiements
          </button>
        )}
        {injected && (
          <span className="px-3 py-1.5 rounded-btn text-xs font-medium text-green">
            Paiement injecté
          </span>
        )}
      </div>

      {/* Formulaire injection */}
      {showInjectForm && !injected && (
        <div className="px-4 py-3 border-t border-border flex items-center gap-2">
          <input
            type="text"
            value={injectLabel}
            onChange={e => setInjectLabel(e.target.value)}
            placeholder="Libellé du paiement"
            className="flex-1 bg-raised border border-border rounded-btn px-3 py-1.5 text-xs text-txt placeholder-txt3 outline-none focus:border-indigo/50"
          />
          <button
            onClick={handleInjectPaiement}
            disabled={injecting}
            className="px-3 py-1.5 rounded-btn text-xs font-medium bg-amber text-black hover:bg-amber/80 transition-colors cursor-pointer disabled:opacity-50 flex-shrink-0"
          >
            {injecting ? '...' : 'Injecter'}
          </button>
          <button
            onClick={() => setShowInjectForm(false)}
            className="px-2 py-1.5 rounded-btn text-xs text-txt3 hover:text-txt transition-colors cursor-pointer flex-shrink-0"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
