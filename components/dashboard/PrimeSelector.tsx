'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import type { Prime } from '@/lib/types'

const PRIME_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#38bdf8', label: 'Sky' },
  { value: '#8b5cf6', label: 'Violet' },
]

interface PrimeSelectorProps {
  primes: Prime[]
  value: string
  onChange: (primeId: string) => void
  isAdmin: boolean
  onCreatePrime: (data: { name: string; color: string; icon: string }) => Promise<Prime>
  onDeletePrime: (primeId: string) => Promise<void>
}

export default function PrimeSelector({
  primes, value, onChange, isAdmin, onCreatePrime, onDeletePrime,
}: PrimeSelectorProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [deletePrimeTarget, setDeletePrimeTarget] = useState<Prime | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError]     = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [newPrime, setNewPrime] = useState({ name: '', icon: '', color: '#6366f1' })

  async function handleCreate() {
    if (!newPrime.name.trim() || !newPrime.icon.trim()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const created = await onCreatePrime({
        name: newPrime.name.trim(),
        icon: newPrime.icon.trim(),
        color: newPrime.color,
      })
      onChange(created.id)
      setNewPrime({ name: '', icon: '', color: '#6366f1' })
      setShowCreate(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erreur lors de la création')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDeletePrime() {
    if (!deletePrimeTarget) return
    setDeleteLoading(true)
    try {
      await onDeletePrime(deletePrimeTarget.id)
      if (value === deletePrimeTarget.id) {
        onChange(primes.find(p => p.id !== deletePrimeTarget.id)?.id ?? '')
      }
      setDeletePrimeTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">Prime</label>

      {/* Select */}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-raised border border-[rgba(255,255,255,0.1)] rounded-btn px-3 py-2 text-sm text-txt outline-none transition-all duration-150 cursor-pointer focus:border-indigo focus:ring-1 focus:ring-indigo/30"
      >
        <option value="" className="bg-surface">Sélectionner une prime</option>
        {primes.map(p => (
          <option key={p.id} value={p.id} className="bg-surface">
            {p.icon} {p.name}
          </option>
        ))}
      </select>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowCreate(!showCreate); setShowManage(false) }}
            className="text-xs text-indigo hover:text-indigo2 transition-colors cursor-pointer"
          >
            + Nouvelle prime
          </button>
          <button
            type="button"
            onClick={() => { setShowManage(!showManage); setShowCreate(false) }}
            className="text-xs text-txt3 hover:text-txt2 transition-colors cursor-pointer"
          >
            Gérer
          </button>
        </div>
      )}

      {/* Inline create form */}
      {showCreate && isAdmin && (
        <div className="bg-raised border border-[rgba(255,255,255,0.1)] rounded-btn p-3 animate-fadeIn">
          {createError && (
            <div className="bg-rose/10 border border-rose/30 rounded-btn px-2.5 py-1.5 text-xs text-rose mb-2">
              {createError}
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Nom de la prime"
              value={newPrime.name}
              onChange={e => setNewPrime(p => ({ ...p, name: e.target.value }))}
              className="flex-1 bg-surface border border-[rgba(255,255,255,0.1)] rounded-btn px-2.5 py-1.5 text-sm text-txt outline-none focus:border-indigo"
            />
            <input
              type="text"
              placeholder="🔥"
              value={newPrime.icon}
              onChange={e => setNewPrime(p => ({ ...p, icon: e.target.value }))}
              className="w-12 bg-surface border border-[rgba(255,255,255,0.1)] rounded-btn px-2 py-1.5 text-sm text-txt text-center outline-none focus:border-indigo"
              maxLength={4}
            />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-txt3">Couleur :</span>
            {PRIME_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setNewPrime(p => ({ ...p, color: c.value }))}
                className="w-5 h-5 rounded-full transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: c.value,
                  outline: newPrime.color === c.value ? `2px solid ${c.value}` : 'none',
                  outlineOffset: '2px',
                  transform: newPrime.color === c.value ? 'scale(1.15)' : 'scale(1)',
                }}
                title={c.label}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button size="sm" loading={createLoading} onClick={handleCreate}>Créer</Button>
          </div>
        </div>
      )}

      {/* Manage primes list */}
      {showManage && isAdmin && (
        <div className="bg-raised border border-[rgba(255,255,255,0.1)] rounded-btn p-3 animate-fadeIn">
          <p className="text-[10px] uppercase tracking-[0.9px] text-txt3 font-semibold mb-2">Primes actives</p>
          {primes.length === 0 ? (
            <p className="text-xs text-txt3">Aucune prime</p>
          ) : (
            <div className="space-y-1">
              {primes.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1 px-1 rounded hover:bg-[rgba(255,255,255,0.03)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-sm text-txt">{p.icon} {p.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeletePrimeTarget(p)}
                    className="p-1 rounded text-txt3 hover:text-rose hover:bg-rose/10 transition-colors cursor-pointer"
                    title="Supprimer cette prime"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete prime confirmation modal */}
      <Modal
        open={!!deletePrimeTarget}
        onClose={() => setDeletePrimeTarget(null)}
        title="Supprimer une prime"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-rose/5 border border-rose/20 rounded-btn p-3">
            <p className="text-sm text-txt">
              Supprimer la prime <strong>{deletePrimeTarget?.icon} {deletePrimeTarget?.name}</strong> supprimera
              aussi <strong>toutes les commissions associées</strong>.
            </p>
            <p className="text-sm text-rose mt-2 font-medium">Cette action est irréversible.</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeletePrimeTarget(null)}>Annuler</Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDeletePrime}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
