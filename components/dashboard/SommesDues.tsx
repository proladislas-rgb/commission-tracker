'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import type { SommeDue, SommeDueStatus } from '@/lib/types'

interface Props {
  sommesDues: SommeDue[]
  userId: string
  isAssociate: boolean
  isAdmin: boolean
  onAdd: (data: { label: string; montant: number; created_by: string }) => Promise<unknown>
  onUpdateStatus: (id: string, status: SommeDueStatus) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_STYLES: Record<SommeDueStatus, { bg: string; color: string; border: string }> = {
  du:       { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  effectue: { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
}

export default function SommesDues({ sommesDues, userId, isAssociate, isAdmin, onAdd, onUpdateStatus, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [form, setForm]           = useState({ label: '', montant: '' })

  async function handleSubmit() {
    if (!form.label || !form.montant) return
    setLoading(true)
    try {
      await onAdd({ label: form.label, montant: parseFloat(form.montant), created_by: userId })
      setShowModal(false)
      setForm({ label: '', montant: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="sommes-dues" className="mb-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold">Montants à percevoir</h2>
        {(isAssociate || isAdmin) && (
          <Button size="sm" onClick={() => setShowModal(true)}>+ Nouveau montant</Button>
        )}
      </div>

      {sommesDues.length > 0 && (
        <div className="rounded-card overflow-hidden" style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {['Libellé', 'Montant', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sommesDues.map((s, index) => (
                <tr key={s.id || `somme-${index}`} className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-300 even:bg-[rgba(255,255,255,0.01)]">
                  <td className="px-4 py-2.5 text-txt">{s.label}</td>
                  <td className="px-4 py-2.5 font-semibold text-txt">{formatCurrency(Number(s.montant))}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={s.status}
                      onChange={e => onUpdateStatus(s.id, e.target.value as SommeDueStatus)}
                      style={{
                        backgroundColor: STATUS_STYLES[s.status].bg,
                        color: STATUS_STYLES[s.status].color,
                        border: `1px solid ${STATUS_STYLES[s.status].border}`,
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
                      <option value="du">Dû</option>
                      <option value="effectue">Effectué</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => {
                        if (window.confirm('Supprimer ce montant ?')) onDelete(s.id)
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

      {sommesDues.length === 0 && (
        <div className="rounded-card p-6 text-center text-txt3 text-sm" style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
          Aucun montant à percevoir
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau montant à percevoir">
        <div className="flex flex-col gap-4">
          <Input
            label="Libellé"
            type="text"
            placeholder="ex : Salaire mars, Bonus Q1"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          />
          <Input
            label="Montant (€)"
            type="number"
            placeholder="ex : 3000"
            value={form.montant}
            onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
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
