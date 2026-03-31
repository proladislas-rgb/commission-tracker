'use client'

import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { PaiementStatusBadge } from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Paiement, PaiementStatus } from '@/lib/types'

interface Props {
  paiements: Paiement[]
  commissionsTotal: number
  userId: string
  isAssociate: boolean
  onAdd: (data: Omit<Paiement, 'id' | 'created_at'>) => Promise<void>
}

const STATUS_OPTIONS = [
  { value: 'effectue',   label: 'Effectué' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_retard',  label: 'En retard' },
]

export default function PaiementTracker({ paiements, commissionsTotal, userId, isAssociate, onAdd }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [form, setForm]           = useState({
    date:    new Date().toISOString().slice(0, 10),
    montant: '',
    label:   '',
    status:  'en_attente' as PaiementStatus,
  })

  const encaisse   = paiements.filter(p => p.status === 'effectue').reduce((s, p) => s + Number(p.montant), 0)
  const enAttente  = paiements.filter(p => p.status === 'en_attente').reduce((s, p) => s + Number(p.montant), 0)
  const enRetard   = paiements.filter(p => p.status === 'en_retard').reduce((s, p) => s + Number(p.montant), 0)
  const progress   = commissionsTotal > 0 ? Math.min(100, (encaisse / commissionsTotal) * 100) : 0

  // Données graphique avec cumul
  const sorted = [...paiements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  let cumul = 0
  const chartData = sorted.map(p => {
    cumul += Number(p.montant)
    return { date: formatDate(p.date), montant: Number(p.montant), cumul, status: p.status }
  })

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

  const barColor = (entry: { status: PaiementStatus }) => {
    if (entry.status === 'effectue')   return '#22c55e'
    if (entry.status === 'en_retard')  return '#f43f5e'
    return '#f59e0b'
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
            className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-4"
            style={{ borderTop: `2px solid ${item.color}` }}
          >
            <p className="text-[10px] uppercase tracking-[0.9px] font-medium mb-1" style={{ color: item.color }}>
              {item.label}
            </p>
            <p className="text-lg font-bold text-txt">{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Barre de progression */}
      <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-4 mb-4">
        <div className="flex justify-between text-xs text-txt2 mb-2">
          <span>Progression encaissement</span>
          <span className="font-semibold text-txt">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-raised rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #10b981)',
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
        <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-4 mb-4">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={chartData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#8898aa', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8898aa', fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Bar dataKey="montant" name="Montant" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Line dataKey="cumul" name="Cumul" stroke="#10b981" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Liste paiements */}
      {paiements.length > 0 && (
        <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-raised">
                {['Date', 'Libellé', 'Montant', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiements.map(p => (
                <tr key={p.id} className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="px-4 py-2.5 text-txt2">{formatDate(p.date)}</td>
                  <td className="px-4 py-2.5 text-txt">{p.label}</td>
                  <td className="px-4 py-2.5 font-semibold text-txt">{formatCurrency(Number(p.montant))}</td>
                  <td className="px-4 py-2.5"><PaiementStatusBadge status={p.status} /></td>
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
