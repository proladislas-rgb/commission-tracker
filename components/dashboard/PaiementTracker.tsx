'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CHART_TOOLTIP_STYLE } from '@/lib/constants'
import type { Paiement, PaiementStatus } from '@/lib/types'

interface Props {
  paiements: Paiement[]
  commissionsTotal: number
  userId: string
  isAssociate: boolean
  onAdd: (data: Omit<Paiement, 'id' | 'created_at'>) => Promise<void>
  onUpdateStatus: (id: string, status: PaiementStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_STYLES: Record<PaiementStatus, { bg: string; color: string; border: string }> = {
  effectue:   { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  en_attente: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  en_retard:  { bg: 'rgba(244,63,94,0.1)',  color: '#f43f5e', border: 'rgba(244,63,94,0.3)' },
}

const STATUS_OPTIONS = [
  { value: 'effectue',   label: 'Effectué' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_retard',  label: 'En retard' },
]

export default function PaiementTracker({ paiements, commissionsTotal, userId, isAssociate, onAdd, onUpdateStatus, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [form, setForm]           = useState({
    date:    new Date().toISOString().slice(0, 10),
    montant: '',
    label:   '',
    status:  'en_attente' as PaiementStatus,
  })

  useEffect(() => { setMounted(true) }, [])

  const { encaisse, enAttente, enRetard } = useMemo(() => ({
    encaisse:  paiements.filter(p => p.status === 'effectue').reduce((s, p) => s + Number(p.montant), 0),
    enAttente: paiements.filter(p => p.status === 'en_attente').reduce((s, p) => s + Number(p.montant), 0),
    enRetard:  paiements.filter(p => p.status === 'en_retard').reduce((s, p) => s + Number(p.montant), 0),
  }), [paiements])
  const progress = commissionsTotal > 0 ? Math.min(100, (encaisse / commissionsTotal) * 100) : 0

  const chartData = useMemo(() => {
    const sorted = [...paiements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    let cumul = 0
    return sorted.map(p => {
      cumul += Number(p.montant)
      return { date: formatDate(p.date), montant: Number(p.montant), cumul, status: p.status }
    })
  }, [paiements])

  async function handleSubmit() {
    if (!form.montant || !form.label) return
    setLoading(true)
    try {
      await onAdd({
        date:          form.date,
        montant:       parseFloat(form.montant),
        label:         form.label,
        status:        form.status,
        commission_id: null,
        created_by:    userId,
      })
      setShowModal(false)
      setForm({ date: new Date().toISOString().slice(0, 10), montant: '', label: '', status: 'en_attente' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="paiements" className="mb-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold">Suivi paiements</h2>
        {isAssociate && (
          <Button size="sm" onClick={() => setShowModal(true)}>+ Nouveau paiement</Button>
        )}
      </div>

      {/* 3 mini-cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Encaissé',   value: encaisse,  color: '#22c55e' },
          { label: 'En attente', value: enAttente, color: '#f59e0b' },
          { label: 'En retard',  value: enRetard,  color: '#f43f5e' },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-[20px] p-4 min-h-[80px] relative overflow-hidden transition-shadow duration-300"
            style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.12)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}88)` }} />
            <p className="text-[10px] uppercase tracking-[0.9px] font-medium mb-1" style={{ color: item.color }}>
              {item.label}
            </p>
            <p className="text-lg font-bold text-txt" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      <div className="rounded-card p-4 mb-4 min-h-[80px]" style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.12)' }}>
        <div className="flex justify-between text-xs text-txt2 mb-2">
          <span>Progression encaissement</span>
          <span className="font-semibold text-txt" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-raised rounded-full overflow-hidden">
          <div
            className="h-full rounded-full will-change-transform"
            style={{
              width: mounted ? `${progress}%` : '0%',
              background: 'linear-gradient(90deg, #8b5cf6, #6366f1, #10b981)',
              transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-txt3 mt-1.5">
          <span>{formatCurrency(encaisse)} encaissé</span>
          <span>{formatCurrency(commissionsTotal)} total</span>
        </div>
      </div>

      {/* Graphique */}
      {chartData.length > 0 && (
        <div className="rounded-card p-4 mb-4 min-h-[220px]" style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.12)' }}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#8b85a8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b85a8', fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => formatCurrency(Number(value))}
                labelStyle={{ color: '#f0eef8' }}
                itemStyle={{ color: '#8b85a8' }}
              />
              <Bar dataKey="montant" name="Montant" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Line dataKey="cumul" name="Cumul" stroke="#10b981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Liste paiements */}
      {paiements.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.12)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(139,92,246,0.04)' }}>
                {['Date', 'Libellé', 'Montant', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiements.map(p => (
                <tr key={p.id} className="border-t border-[rgba(139,92,246,0.06)] hover:bg-[rgba(139,92,246,0.06)] transition-colors duration-300 even:bg-[rgba(139,92,246,0.02)]">
                  <td className="px-4 py-2.5 text-txt2">{formatDate(p.date)}</td>
                  <td className="px-4 py-2.5 text-txt">{p.label}</td>
                  <td className="px-4 py-2.5 font-semibold text-txt" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(Number(p.montant))}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={p.status}
                      onChange={e => onUpdateStatus(p.id, e.target.value as PaiementStatus)}
                      style={{
                        backgroundColor: STATUS_STYLES[p.status].bg,
                        color: STATUS_STYLES[p.status].color,
                        border: `1px solid ${STATUS_STYLES[p.status].border}`,
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      }}
                    >
                      <option value="effectue">Effectué</option>
                      <option value="en_attente">En attente</option>
                      <option value="en_retard">En retard</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => {
                        if (window.confirm('Supprimer ce paiement ?')) onDelete(p.id)
                      }}
                      className="p-1 rounded-[6px] text-txt3 hover:text-rose hover:bg-rose/10 transition-all duration-200 cursor-pointer"
                      title="Supprimer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nouveau paiement */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau paiement">
        <div className="flex flex-col gap-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Montant (€)"
            type="number"
            placeholder="ex : 5000"
            value={form.montant}
            onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
          />
          <Input
            label="Libellé"
            type="text"
            placeholder="ex : Virement mars"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />
          <Select
            label="Statut"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as PaiementStatus }))}
          />
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button loading={loading} onClick={handleSubmit}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
