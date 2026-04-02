'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import { useClients } from './useClients'
import type { Client } from '@/lib/types'

const STORAGE_KEY = 'ct_selected_client'

interface ClientContextValue {
  clients: Client[]
  pinnedClients: Client[]
  selectedClientId: string | null
  selectedClient: Client | null
  setSelectedClientId: (id: string | null) => void
  clientsLoading: boolean
  addClient: (data: { name: string; siren?: string; address?: string; email?: string; color?: string; created_by: string }) => Promise<Client>
  updateClient: (id: string, data: { name?: string; siren?: string; address?: string; email?: string; color?: string }) => Promise<void>
  togglePinClient: (id: string) => Promise<void>
  removeClient: (id: string) => Promise<void>
  reloadClients: () => Promise<void>
}

const ClientContext = createContext<ClientContextValue | null>(null)

function pickFallbackClient(clients: Client[]): string | null {
  const pinned = clients.find((c) => c.pinned)
  if (pinned) return pinned.id
  if (clients.length > 0) return clients[0].id
  return null
}

export function ClientProvider({ children }: { children: ReactNode }) {
  const {
    clients,
    loading,
    reload,
    add,
    update,
    togglePin,
    remove,
  } = useClients()

  const [selectedClientId, setSelectedClientIdRaw] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  })

  // Persist selection to localStorage
  const setSelectedClientId = useCallback((id: string | null) => {
    setSelectedClientIdRaw(id)
    if (typeof window === 'undefined') return
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  // Auto-select fallback when clients load or selected client disappears
  const needsFallback = !loading && (
    (clients.length === 0 && selectedClientId !== null) ||
    (clients.length > 0 && !clients.some((c) => c.id === selectedClientId))
  )
  const fallbackId = needsFallback
    ? (clients.length === 0 ? null : pickFallbackClient(clients))
    : undefined

  useEffect(() => {
    if (fallbackId !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync fallback selection when external client data changes
      setSelectedClientId(fallbackId)
    }
  }, [fallbackId, setSelectedClientId])

  const pinnedClients = useMemo(
    () => clients.filter((c) => c.pinned),
    [clients],
  )

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  )

  const value = useMemo<ClientContextValue>(
    () => ({
      clients,
      pinnedClients,
      selectedClientId,
      selectedClient,
      setSelectedClientId,
      clientsLoading: loading,
      addClient: add,
      updateClient: update,
      togglePinClient: togglePin,
      removeClient: remove,
      reloadClients: reload,
    }),
    [
      clients,
      pinnedClients,
      selectedClientId,
      selectedClient,
      setSelectedClientId,
      loading,
      add,
      update,
      togglePin,
      remove,
      reload,
    ],
  )

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  )
}

export function useClientContext(): ClientContextValue {
  const ctx = useContext(ClientContext)
  if (!ctx) {
    throw new Error('useClientContext doit être utilisé dans un ClientProvider')
  }
  return ctx
}
