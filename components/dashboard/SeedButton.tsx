'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { PaiementStatus } from '@/lib/types'

interface Props {
  userId: string
  onImported: () => void
}

const COMMISSIONS_DATA = [
  { prime_id: 'led',  ca: 8915880, commission: 409495, dossiers: 1250, mois: '2025-12', status: 'due' as const, notes: null },
  { prime_id: 'quad', ca: 502080,  commission: 20200,  dossiers: 597,  mois: '2025-12', status: 'due' as const, notes: null },
  { prime_id: 'velo', ca: 600300,  commission: 20700,  dossiers: 307,  mois: '2025-12', status: 'due' as const, notes: null },
]

const PAIEMENTS_DATA: { date: string; montant: number; label: string; status: PaiementStatus }[] = [
  { date: '2025-12-23', montant: 3000,  label: 'Premier virement',  status: 'effectue' },
  { date: '2026-01-30', montant: 10500, label: 'Virement janvier',  status: 'effectue' },
  { date: '2026-02-12', montant: 20500, label: 'Virement février',  status: 'effectue' },
]

export default function SeedButton({ userId, onImported }: Props) {
  const [hasData, setHasData] = useState<boolean | null>(null)
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  useEffect(() => {
    supabase
      .from('commissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setHasData((count ?? 0) > 0))
  }, [userId])

  // Masquer si données présentes ou déjà importé
  if (hasData === null || hasData || done) return null

  async function handleImport() {
    setLoading(true)
    try {
      const comPayloads = COMMISSIONS_DATA.map(c => ({
        ...c,
        user_id:    userId,
        created_by: userId,
      }))
      const { error: comErr } = await supabase.from('commissions').insert(comPayloads)
      if (comErr) throw comErr

      const paiPayloads = PAIEMENTS_DATA.map(p => ({
        ...p,
        commission_id: null,
        created_by:    userId,
      }))
      const { error: paiErr } = await supabase.from('paiements').insert(paiPayloads)
      if (paiErr) throw paiErr

      await supabase.from('activity_log').insert({
        user_id:     userId,
        action:      'create',
        entity_type: 'commission',
        entity_id:   userId,
        details:     { description: 'Import initial des données (commissions + paiements)' },
      })

      setDone(true)
      setOpen(false)
      onImported()
    } catch (e) {
      alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const totalCA          = COMMISSIONS_DATA.reduce((s, c) => s + c.ca, 0)
  const totalCommissions = COMMISSIONS_DATA.reduce((s, c) => s + c.commission, 0)
  const totalPaye        = PAIEMENTS_DATA.reduce((s, p) => s + p.montant, 0)

  return (
    <>
      <div className="mb-6">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo/10 border border-indigo/30 rounded-card text-sm text-indigo hover:bg-indigo/20 transition-all duration-150 cursor-pointer"
        >
          <span>⚡</span>
          <span className="font-medium">Importer les données initiales</span>
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="⚡ Import des données initiales" size="lg">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-txt2">
            Les données suivantes vont être importées et associées à votre compte.
          </p>

          {/* Commissions */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mb-2">Commissions — déc. 2025</p>
            <div className="bg-raised rounded-card p-3 space-y-1.5">
              {COMMISSIONS_DATA.map(c => (
                <div key={c.prime_id} className="flex justify-between text-sm">
                  <span className="text-txt">
                    {c.prime_id === 'led' ? '💡 LED' : c.prime_id === 'quad' ? '🛵 Quadricycle' : '🚲 Vélo cargo'}
                    <span className="text-txt3 ml-2">{c.dossiers.toLocaleString('fr-FR')} dossiers</span>
                  </span>
                  <div className="flex gap-4 text-right">
                    <span className="text-txt2">CA : {formatCurrency(c.ca)}</span>
                    <span className="text-amber font-medium">Com. : {formatCurrency(c.commission)}</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm">
                <span className="text-txt">Total</span>
                <div className="flex gap-4">
                  <span className="text-txt">CA : {formatCurrency(totalCA)}</span>
                  <span className="text-amber">Com. : {formatCurrency(totalCommissions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Paiements */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mb-2">Paiements reçus</p>
            <div className="bg-raised rounded-card p-3 space-y-1.5">
              {PAIEMENTS_DATA.map(p => (
                <div key={p.date} className="flex justify-between text-sm">
                  <span className="text-txt">{p.label}</span>
                  <div className="flex gap-3 items-center">
                    <span className="font-medium text-txt">{formatCurrency(p.montant)}</span>
                    <span className="text-[11px] text-green">✅ Effectué</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-1.5 text-sm font-semibold text-right">
                Total encaissé : <span className="text-green">{formatCurrency(totalPaye)}</span>
              </div>
            </div>
          </div>

          {/* Récap */}
          <div className="bg-indigo/5 border border-indigo/20 rounded-card p-4 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-txt2">CA total :</span> <span className="font-bold text-txt">{formatCurrency(totalCA)}</span></div>
            <div><span className="text-txt2">Commissions :</span> <span className="font-bold text-amber">{formatCurrency(totalCommissions)}</span></div>
            <div><span className="text-txt2">Encaissé :</span> <span className="font-bold text-green">{formatCurrency(totalPaye)}</span></div>
            <div><span className="text-txt2">Restant dû :</span> <span className="font-bold text-rose">{formatCurrency(totalCommissions - totalPaye)}</span></div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button loading={loading} onClick={handleImport}>Confirmer l&apos;import</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
