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
  const [downloading, setDownloading] = useState(false)

  // Génère un vrai fichier PDF téléchargé en 1 clic (nom garanti `Facture-N.pdf`).
  // Le HTML est rendu dans une iframe isolée (aucune fuite de styles vers l'app),
  // capturé via html2canvas puis placé dans un PDF A4 plein cadre.
  async function handleDownloadPDF() {
    if (downloading) return
    setDownloading(true)
    let iframe: HTMLIFrameElement | null = null
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;'
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument
      if (!doc) throw new Error('document iframe indisponible')
      doc.open()
      doc.write(generateInvoiceHTML(data))
      doc.close()

      // Attendre le rendu complet puis les polices (évite un PDF vide/partiel).
      // Garde-fou timeout : avec document.write, l'event `load` est peu fiable
      // selon les navigateurs — sans ce fallback la promesse pourrait pendre
      // indéfiniment (bouton bloqué + iframe orpheline).
      await new Promise<void>(resolve => {
        if (doc.readyState === 'complete') {
          resolve()
          return
        }
        iframe!.onload = () => resolve()
        setTimeout(resolve, 1500)
      })
      try {
        if (doc.fonts?.ready) await doc.fonts.ready
      } catch {
        /* polices: best-effort, on continue */
      }
      // Laisser passer un cycle de paint avant la capture (évite un rendu partiel)
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )

      const page = doc.querySelector('.page') as HTMLElement | null
      if (!page) throw new Error('contenu de la facture introuvable')

      const canvas = await html2canvas(page, {
        scale: 2, // ~192 dpi : texte net pour impression
        backgroundColor: '#ffffff',
        useCORS: true,
        width: page.offsetWidth,
        height: page.offsetHeight,
      })

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
      })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
      // Nettoie le numéro pour un nom de fichier sûr (pas de / ni d'espaces parasites)
      const safeNumber = String(data.invoiceNumber).replace(/[^\w.-]+/g, '_') || 'facture'
      pdf.save(`Facture-${safeNumber}.pdf`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('[invoice/pdf]', err)
      toast(`Échec de la génération du PDF : ${msg}`, 'error')
    } finally {
      if (iframe) document.body.removeChild(iframe)
      setDownloading(false)
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
          disabled={downloading}
          className="px-3 py-1.5 rounded-btn text-xs font-medium bg-indigo text-white hover:bg-indigo/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          {downloading ? 'Génération…' : 'Télécharger PDF'}
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
