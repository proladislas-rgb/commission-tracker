'use client'

import { useState, useMemo, useEffect } from 'react'
import { CommissionStatusBadge } from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import PrimeSelector from '@/components/dashboard/PrimeSelector'
import { formatCurrency, formatMois } from '@/lib/utils'
import { PRIME_COLORS } from '@/lib/constants'
import type { Commission, CommissionStatus, Prime } from '@/lib/types'

interface Props {
  commissions: Commission[]
  primes: Prime[]
  userId: string
  isAssociate: boolean
  isAdmin: boolean
  onAdd: (data: Omit<Commission, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdate: (id: string, data: Partial<Commission>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCreatePrime: (data: { name: string; color: string; icon: string }) => Promise<Prime>
  onDeletePrime: (primeId: string) => Promise<void>
  onCreatePrimeWithCommission: (
    primeData: { name: string; color: string; icon: string },
    commissionData: { mois: string; dossiers: number; ca: number; commission: number; status: CommissionStatus },
  ) => Promise<void>
}

const STATUS_OPTIONS = [
  { value: 'due',     label: 'Dû' },
  { value: 'partiel', label: 'Partiel' },
  { value: 'paye',    label: 'Payé' },
]

const EMPTY_COMMISSION_FORM = {
  prime_id:   '',
  ca:         '',
  commission: '',
  dossiers:   '',
  mois:       new Date().toISOString().slice(0, 7),
  status:     'due' as CommissionStatus,
  notes:      '',
}

const EMPTY_PRIME_FORM = {
  name:       '',
  icon:       '',
  color:      '#6366f1',
  mois:       new Date().toISOString().slice(0, 7),
  dossiers:   '',
  ca:         '',
  commission: '',
  status:     'due' as CommissionStatus,
}

export default function CommissionTable({
  commissions, primes, userId, isAssociate, isAdmin,
  onAdd, onUpdate, onDelete, onCreatePrime, onDeletePrime, onCreatePrimeWithCommission,
}: Props) {
  const [filter, setFilter]             = useState<string>('all')
  const [page, setPage]                 = useState(0)
  const PAGE_SIZE = 10
  // Filtres avancés
  const [showFilters, setShowFilters]   = useState(false)
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())
  const [moisFrom, setMoisFrom]         = useState('')
  const [moisTo, setMoisTo]             = useState('')
  const [caMin, setCaMin]               = useState('')
  const [caMax, setCaMax]               = useState('')
  // Formulaire ajout commission (sur prime existante)
  const [showAdd, setShowAdd]           = useState(false)
  const [editId, setEditId]             = useState<string | null>(null)
  const [form, setForm]                 = useState(EMPTY_COMMISSION_FORM)
  const [loading, setLoading]           = useState(false)
  // Formulaire création prime + commission (admin)
  const [showNewPrime, setShowNewPrime] = useState(false)
  const [primeForm, setPrimeForm]       = useState(EMPTY_PRIME_FORM)
  const [primeLoading, setPrimeLoading] = useState(false)
  const [primeError, setPrimeError]     = useState('')
  // Suppression commission
  const [deleteTarget, setDeleteTarget]   = useState<Commission | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtered = useMemo(() => {
    let result = commissions
    // Filtre par prime
    if (filter !== 'all') {
      result = result.filter(c => String(c.prime_id) === String(filter))
    }
    // Filtre par statut
    if (statusFilter.size > 0) {
      result = result.filter(c => statusFilter.has(c.status))
    }
    // Filtre par mois (range)
    if (moisFrom) {
      result = result.filter(c => c.mois >= moisFrom)
    }
    if (moisTo) {
      result = result.filter(c => c.mois <= moisTo)
    }
    // Filtre par CA min/max
    const minCA = Number(caMin)
    const maxCA = Number(caMax)
    if (caMin && !isNaN(minCA)) {
      result = result.filter(c => (Number(c.ca) || 0) >= minCA)
    }
    if (caMax && !isNaN(maxCA)) {
      result = result.filter(c => (Number(c.ca) || 0) <= maxCA)
    }
    return result
  }, [commissions, filter, statusFilter, moisFrom, moisTo, caMin, caMax])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = useMemo(() =>
    filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  )

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [filter, statusFilter, moisFrom, moisTo, caMin, caMax])

  const hasAdvancedFilters = statusFilter.size > 0 || moisFrom !== '' || moisTo !== '' || caMin !== '' || caMax !== ''

  function resetAllFilters() {
    setFilter('all')
    setStatusFilter(new Set())
    setMoisFrom('')
    setMoisTo('')
    setCaMin('')
    setCaMax('')
  }

  function toggleStatusFilter(status: string) {
    setStatusFilter(prev => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }

  const canEdit = (c: Commission) => isAdmin || (isAssociate && c.user_id === userId)
  const canDelete = (c: Commission) => isAdmin || (isAssociate && c.user_id === userId)

  const totals = useMemo(() => ({
    ca:         filtered.reduce((s, c) => s + (Number(c.ca) || 0), 0),
    commission: filtered.reduce((s, c) => s + (Number(c.commission) || 0), 0),
    dossiers:   filtered.reduce((s, c) => s + (Number(c.dossiers) || 0), 0),
  }), [filtered])

  // --- Ajout commission sur prime existante ---
  function openAdd() {
    setForm({ ...EMPTY_COMMISSION_FORM, prime_id: primes[0]?.id ?? '' })
    setEditId(null)
    setShowAdd(true)
  }

  function openEdit(c: Commission) {
    setForm({
      prime_id:   c.prime_id,
      ca:         String(c.ca),
      commission: String(c.commission),
      dossiers:   String(c.dossiers),
      mois:       c.mois,
      status:     c.status,
      notes:      c.notes ?? '',
    })
    setEditId(c.id)
    setShowAdd(true)
  }

  async function handleSubmitCommission() {
    if (!form.prime_id || !Number(form.ca) || !Number(form.commission)) return
    setLoading(true)
    try {
      const payload = {
        prime_id:   form.prime_id,
        ca:         parseFloat(form.ca),
        commission: parseFloat(form.commission),
        dossiers:   parseInt(form.dossiers) || 0,
        mois:       form.mois,
        status:     form.status,
        notes:      form.notes || null,
        user_id:    userId,
        created_by: userId,
        client_id:  null as string | null,
      }
      if (editId) {
        await onUpdate(editId, payload)
      } else {
        await onAdd(payload)
      }
      setShowAdd(false)
    } finally {
      setLoading(false)
    }
  }

  // --- Création prime + commission (admin) ---
  function openNewPrime() {
    setPrimeForm({ ...EMPTY_PRIME_FORM })
    setPrimeError('')
    setShowNewPrime(true)
  }

  async function handleSubmitPrime() {
    const ca = Number(primeForm.ca)
    const comm = Number(primeForm.commission)
    if (!primeForm.name.trim() || !primeForm.icon.trim() || !ca || isNaN(ca) || !comm || isNaN(comm)) return
    setPrimeLoading(true)
    setPrimeError('')
    try {
      await onCreatePrimeWithCommission(
        { name: primeForm.name.trim(), color: primeForm.color, icon: primeForm.icon.trim() },
        {
          mois:       primeForm.mois,
          dossiers:   parseInt(primeForm.dossiers) || 0,
          ca:         parseFloat(primeForm.ca),
          commission: parseFloat(primeForm.commission),
          status:     primeForm.status,
        },
      )
      setShowNewPrime(false)
      setPrimeForm({ ...EMPTY_PRIME_FORM })
    } catch (e) {
      setPrimeError(e instanceof Error ? e.message : 'Erreur lors de la création')
    } finally {
      setPrimeLoading(false)
    }
  }

  // --- Suppression commission ---
  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await onDelete(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <section id="commissions" className="mb-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mr-2">Commissions</h2>
          {/* Filtres pills */}
          {[{ id: 'all', label: 'Tout', color: '#6366f1' }, ...primes.map(p => ({ id: p.id, label: `${p.icon} ${p.name}`, color: p.color }))].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer"
              style={
                filter === f.id
                  ? { backgroundColor: `${f.color}22`, color: f.color, border: `1px solid ${f.color}44` }
                  : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8898aa', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5"
            style={{
              backgroundColor: showFilters || hasAdvancedFilters ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              color: showFilters || hasAdvancedFilters ? '#6366f1' : '#8898aa',
              border: `1px solid ${showFilters || hasAdvancedFilters ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtres
            {hasAdvancedFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo" />
            )}
          </button>
          {isAdmin && (
            <Button size="sm" variant="secondary" onClick={openNewPrime}>+ Nouvelle prime</Button>
          )}
          {isAssociate && (
            <Button size="sm" onClick={openAdd}>+ Ajouter</Button>
          )}
        </div>
      </div>

      {/* Barre de filtres avancés */}
      {showFilters && (
        <div
          className="mb-4 rounded-[14px] p-4 animate-fadeIn"
          style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex flex-col gap-4">
            {/* Ligne 1 : Statut */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-2 block">Statut</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => toggleStatusFilter(s.value)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer"
                    style={
                      statusFilter.has(s.value)
                        ? { backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }
                        : { backgroundColor: 'rgba(255,255,255,0.02)', color: '#8898aa', border: '1px solid rgba(255,255,255,0.07)' }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ligne 2 : Mois range + CA range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">Mois (de)</label>
                <input
                  type="month"
                  value={moisFrom}
                  onChange={e => setMoisFrom(e.target.value)}
                  className="w-full bg-raised border border-border rounded-[8px] px-3 py-2 text-sm text-txt outline-none focus:border-indigo transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">Mois (à)</label>
                <input
                  type="month"
                  value={moisTo}
                  onChange={e => setMoisTo(e.target.value)}
                  className="w-full bg-raised border border-border rounded-[8px] px-3 py-2 text-sm text-txt outline-none focus:border-indigo transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">CA min (€)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={caMin}
                  onChange={e => setCaMin(e.target.value)}
                  className="w-full bg-raised border border-border rounded-[8px] px-3 py-2 text-sm text-txt outline-none focus:border-indigo transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">CA max (€)</label>
                <input
                  type="number"
                  placeholder="999999"
                  value={caMax}
                  onChange={e => setCaMax(e.target.value)}
                  className="w-full bg-raised border border-border rounded-[8px] px-3 py-2 text-sm text-txt outline-none focus:border-indigo transition-colors"
                />
              </div>
            </div>

            {/* Réinitialiser */}
            {hasAdvancedFilters && (
              <div className="flex justify-end">
                <button
                  onClick={resetAllFilters}
                  className="px-3 py-1.5 rounded-[8px] text-xs font-medium text-rose hover:bg-rose/10 transition-colors cursor-pointer"
                >
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-card overflow-hidden shadow-card" style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {['Prime', 'CA', 'Commission', 'Dossiers', 'Mois', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-txt3">
                    Aucune commission
                  </td>
                </tr>
              ) : (
                paginated.map((c, i) => {
                  const prime = primes.find(p => String(p.id) === String(c.prime_id))
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-300 will-change-transform even:bg-[rgba(255,255,255,0.01)]"
                      style={{
                        animation: i < 10 ? `fadeIn 0.3s ease ${i * 0.03}s both` : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: prime?.color }}
                          />
                          <span className="text-txt">{prime?.icon} {prime?.name ?? c.prime_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-txt">{formatCurrency(Number(c.ca))}</td>
                      <td className="px-4 py-3 text-amber">{formatCurrency(Number(c.commission))}</td>
                      <td className="px-4 py-3 text-txt2">{Number(c.dossiers).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-txt2">{formatMois(c.mois)}</td>
                      <td className="px-4 py-3"><CommissionStatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {canEdit(c) && (
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-btn text-txt2 hover:text-indigo hover:bg-indigo/10 transition-colors"
                              title="Modifier"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {canDelete(c) && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 rounded-btn text-txt2 hover:text-rose hover:bg-rose/10 transition-colors"
                              title="Supprimer"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <td className="px-4 py-3 text-[10px] uppercase tracking-[0.9px] text-txt2 font-bold">Total</td>
                  <td className="px-4 py-3 font-bold text-txt">{formatCurrency(totals.ca)}</td>
                  <td className="px-4 py-3 font-bold text-amber">{formatCurrency(totals.commission)}</td>
                  <td className="px-4 py-3 font-bold text-txt2">{totals.dossiers.toLocaleString('fr-FR')}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
            <span className="text-xs text-txt3">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded-[8px] text-txt2 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded-[8px] text-txt2 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal ajout/modification commission (sur prime EXISTANTE) */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={editId ? 'Modifier la commission' : 'Ajouter une commission'}
      >
        <div className="flex flex-col gap-4">
          <PrimeSelector
            primes={primes}
            value={form.prime_id}
            onChange={primeId => setForm(f => ({ ...f, prime_id: primeId }))}
            isAdmin={isAdmin}
            onCreatePrime={onCreatePrime}
            onDeletePrime={onDeletePrime}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="CA (€)"
              type="number"
              placeholder="ex : 500000"
              value={form.ca}
              onChange={e => setForm(f => ({ ...f, ca: e.target.value }))}
            />
            <Input
              label="Commission (€)"
              type="number"
              placeholder="ex : 20000"
              value={form.commission}
              onChange={e => setForm(f => ({ ...f, commission: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dossiers"
              type="number"
              placeholder="ex : 150"
              value={form.dossiers}
              onChange={e => setForm(f => ({ ...f, dossiers: e.target.value }))}
            />
            <Input
              label="Mois (YYYY-MM)"
              type="month"
              value={form.mois}
              onChange={e => setForm(f => ({ ...f, mois: e.target.value }))}
            />
          </div>
          <Select
            label="Statut"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as CommissionStatus }))}
          />
          <Input
            label="Notes (optionnel)"
            type="text"
            placeholder="Remarques..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button loading={loading} onClick={handleSubmitCommission}>
              {editId ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal création prime + commission (NOUVEAU — admin only) */}
      <Modal
        open={showNewPrime}
        onClose={() => { setShowNewPrime(false); setPrimeError('') }}
        title="Ajouter une prime"
      >
        <div className="flex flex-col gap-4">
          {primeError && (
            <div className="bg-rose/10 border border-rose/30 rounded-btn px-3 py-2 text-sm text-rose">
              {primeError}
            </div>
          )}
          {/* Infos prime */}
          <div className="grid grid-cols-[1fr_64px] gap-3">
            <Input
              label="Nom de la prime"
              type="text"
              placeholder="ex : Panneaux solaires"
              value={primeForm.name}
              onChange={e => setPrimeForm(f => ({ ...f, name: e.target.value }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">Icône</label>
              <input
                type="text"
                placeholder="🔥"
                value={primeForm.icon}
                onChange={e => setPrimeForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full bg-raised border border-border rounded-btn px-2 py-2 text-sm text-txt text-center outline-none focus:border-indigo"
                maxLength={4}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">Couleur</label>
            <div className="flex gap-2">
              {PRIME_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setPrimeForm(f => ({ ...f, color: c.value }))}
                  className="w-6 h-6 rounded-full transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor: c.value,
                    outline: primeForm.color === c.value ? `2px solid ${c.value}` : 'none',
                    outlineOffset: '2px',
                    transform: primeForm.color === c.value ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          {/* Infos commission */}
          <div className="border-t border-border pt-4">
            <p className="text-[10px] uppercase tracking-[0.9px] text-txt3 font-semibold mb-3">Première commission</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="CA (€)"
                  type="number"
                  placeholder="ex : 500000"
                  value={primeForm.ca}
                  onChange={e => setPrimeForm(f => ({ ...f, ca: e.target.value }))}
                />
                <Input
                  label="Commission (€)"
                  type="number"
                  placeholder="ex : 20000"
                  value={primeForm.commission}
                  onChange={e => setPrimeForm(f => ({ ...f, commission: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Dossiers"
                  type="number"
                  placeholder="ex : 150"
                  value={primeForm.dossiers}
                  onChange={e => setPrimeForm(f => ({ ...f, dossiers: e.target.value }))}
                />
                <Input
                  label="Mois"
                  type="month"
                  value={primeForm.mois}
                  onChange={e => setPrimeForm(f => ({ ...f, mois: e.target.value }))}
                />
              </div>
              <Select
                label="Statut"
                options={STATUS_OPTIONS}
                value={primeForm.status}
                onChange={e => setPrimeForm(f => ({ ...f, status: e.target.value as CommissionStatus }))}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="secondary" onClick={() => { setShowNewPrime(false); setPrimeError('') }}>Annuler</Button>
            <Button loading={primeLoading} onClick={handleSubmitPrime}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation suppression commission */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer une commission"
        size="sm"
      >
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-txt">
              Supprimer cette commission{' '}
              <strong>{primes.find(p => p.id === deleteTarget.prime_id)?.name ?? deleteTarget.prime_id}</strong>{' '}
              de <strong>{formatCurrency(Number(deleteTarget.ca))}</strong> ?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Annuler</Button>
              <Button variant="danger" loading={deleteLoading} onClick={handleConfirmDelete}>
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
