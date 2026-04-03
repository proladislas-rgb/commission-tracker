'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useClientContext } from '@/hooks/useClientContext'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import type { Client } from '@/lib/types'

/* ── Couleurs par défaut pour le picker ── */
const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#f43f5e',
  '#38bdf8', '#8b5cf6', '#ec4899', '#14b8a6',
]

/* ── Client Card ── */
function ClientCard({
  client,
  isSelected,
  onSelect,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  client: Client
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onTogglePin: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="group relative rounded-card border p-4 transition-all duration-200 hover:border-indigo/40"
      style={{
        backgroundColor: '#151a24',
        borderColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(61,79,99,0.25)',
        boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.12)' : 'none',
      }}
    >
      {/* Top row: color dot + name */}
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 block h-3.5 w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: client.color }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-txt truncate">{client.name}</h3>
          {client.siren && (
            <p className="text-xs text-txt2 mt-0.5">SIRET : {client.siren}</p>
          )}
          {client.address && (
            <p className="text-xs text-txt3 mt-0.5 truncate">{client.address}</p>
          )}
          {client.email && (
            <p className="text-xs text-txt3 mt-0.5 truncate">{client.email}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={onSelect}
          className="rounded-btn px-2.5 py-1 text-xs font-medium transition-colors"
          style={{
            background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
            color: '#6366f1',
          }}
        >
          {isSelected ? 'Actif' : 'Sélectionner'}
        </button>
        <button
          onClick={onTogglePin}
          className="rounded-btn p-1.5 text-txt3 hover:text-amber transition-colors"
          title={client.pinned ? 'Désépingler' : 'Épingler'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={client.pinned ? '#f59e0b' : 'none'} stroke={client.pinned ? '#f59e0b' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
        </button>
        <button
          onClick={onEdit}
          className="rounded-btn p-1.5 text-txt3 hover:text-txt transition-colors"
          title="Modifier"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="rounded-btn p-1.5 text-txt3 hover:text-rose transition-colors"
          title="Supprimer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ── Page principale ── */
export default function ClientsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const {
    clients,
    pinnedClients,
    selectedClientId,
    setSelectedClientId,
    addClient,
    updateClient,
    togglePinClient,
    removeClient,
    clientsLoading,
  } = useClientContext()

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)

  /* Form state */
  const [formName, setFormName] = useState('')
  const [formSiren, setFormSiren] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formColor, setFormColor] = useState(DEFAULT_COLORS[0])

  /* Accordion state */
  const [othersOpen, setOthersOpen] = useState(false)

  /* Derived: clients not pinned */
  const otherClients = useMemo(
    () => clients.filter((c) => !c.pinned),
    [clients],
  )

  /* Open modal for create */
  const openCreate = useCallback(() => {
    setEditClient(null)
    setFormName('')
    setFormSiren('')
    setFormAddress('')
    setFormEmail('')
    setFormColor(DEFAULT_COLORS[0])
    setModalOpen(true)
  }, [])

  /* Open modal for edit */
  const openEdit = useCallback((client: Client) => {
    setEditClient(client)
    setFormName(client.name)
    setFormSiren(client.siren ?? '')
    setFormAddress(client.address ?? '')
    setFormEmail(client.email ?? '')
    setFormColor(client.color)
    setModalOpen(true)
  }, [])

  /* Submit create or update */
  const handleSubmit = useCallback(async () => {
    if (!formName.trim() || !user) return
    setSaving(true)
    try {
      if (editClient) {
        await updateClient(editClient.id, {
          name: formName.trim(),
          siren: formSiren.trim() || undefined,
          address: formAddress.trim() || undefined,
          email: formEmail.trim() || undefined,
          color: formColor,
        })
      } else {
        const created = await addClient({
          name: formName.trim(),
          siren: formSiren.trim() || undefined,
          address: formAddress.trim() || undefined,
          email: formEmail.trim() || undefined,
          color: formColor,
          created_by: user.id,
        })
        setSelectedClientId(created.id)
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }, [formName, formSiren, formAddress, formEmail, formColor, editClient, user, addClient, updateClient, setSelectedClientId])

  /* Select and navigate to dashboard */
  const handleSelect = useCallback((id: string) => {
    setSelectedClientId(id)
    router.push('/dashboard')
  }, [setSelectedClientId, router])

  /* Delete with fallback */
  const handleDelete = useCallback(async (id: string) => {
    await removeClient(id)
    if (String(selectedClientId) === String(id)) {
      const remaining = clients.filter((c) => c.id !== id)
      if (remaining.length > 0) {
        setSelectedClientId(remaining[0].id)
      }
    }
  }, [removeClient, selectedClientId, clients, setSelectedClientId])

  /* ── Loading ── */
  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold text-txt"
          >
            Mes clients
          </h1>
          <p className="text-sm text-txt2 mt-1">
            {clients.length === 0
              ? 'Aucun client pour le moment'
              : `${clients.length} client${clients.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={openCreate}>+ Nouveau client</Button>
      </div>

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3d4f63" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2 className="text-lg font-semibold text-txt mb-1">Aucun client</h2>
          <p className="text-sm text-txt2 mb-6">Créez votre premier client pour commencer</p>
          <Button onClick={openCreate}>+ Créer un client</Button>
        </div>
      )}

      {/* Pinned section */}
      {pinnedClients.length > 0 && (
        <section className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold mb-3">
            Clients épinglés
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedClients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                isSelected={String(selectedClientId) === String(c.id)}
                onSelect={() => handleSelect(c.id)}
                onEdit={() => openEdit(c)}
                onTogglePin={() => togglePinClient(c.id)}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Others accordion */}
      {otherClients.length > 0 && (
        <section>
          <button
            onClick={() => setOthersOpen((v) => !v)}
            className="flex items-center gap-2 mb-3 group/acc"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8898aa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200"
              style={{ transform: othersOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-semibold">
              Autres clients ({otherClients.length})
            </span>
          </button>

          {othersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherClients.map((c) => (
                <ClientCard
                  key={c.id}
                  client={c}
                  isSelected={String(selectedClientId) === String(c.id)}
                  onSelect={() => handleSelect(c.id)}
                  onEdit={() => openEdit(c)}
                  onTogglePin={() => togglePinClient(c.id)}
                  onDelete={() => handleDelete(c.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editClient ? 'Modifier le client' : 'Nouveau client'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Raison Sociale *"
            placeholder="ex : ECODISTRIB"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Input
            label="SIRET"
            placeholder="ex : 903 879 492 00012"
            value={formSiren}
            onChange={(e) => setFormSiren(e.target.value)}
          />
          <Input
            label="Adresse Siège Social"
            placeholder="ex : 29 Rue Pradier, 92410 Ville-d'Avray"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
          />
          <Input
            label="Mail"
            type="email"
            placeholder="ex : contact@client.eu"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />

          {/* Color picker */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-2">
              Couleur
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormColor(color)}
                  className="rounded-full transition-transform duration-150"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: color,
                    transform: formColor === color ? 'scale(1.2)' : 'scale(1)',
                    outline: formColor === color ? '2px solid white' : 'none',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              loading={saving}
              disabled={!formName.trim()}
            >
              {editClient ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
