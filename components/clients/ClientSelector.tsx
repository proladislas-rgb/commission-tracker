'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientContext } from '@/hooks/useClientContext'

interface ClientSelectorProps {
  collapsed: boolean
}

export default function ClientSelector({ collapsed }: ClientSelectorProps) {
  const { pinnedClients, selectedClient, setSelectedClientId } = useClientContext()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  // --- Collapsed mode: color dot only ---
  if (collapsed) {
    return (
      <div ref={containerRef} className="relative flex justify-center">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ background: open ? 'rgba(139,92,246,0.08)' : 'transparent' }}
          title={selectedClient?.name ?? 'Sélectionner un client'}
        >
          <span
            className="block w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: selectedClient?.color ?? '#3d4f63' }}
          />
        </button>

        {open && (
          <div
            className="absolute left-full ml-2 top-0 z-50 min-w-[200px] py-1 rounded-lg border shadow-xl"
            style={{
              background: '#0f1117',
              borderColor: 'rgba(139,92,246,0.2)',
            }}
          >
            {pinnedClients.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  setSelectedClientId(client.id)
                  setOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left"
                style={{
                  color: client.id === selectedClient?.id ? '#e8edf5' : '#8898aa',
                  background:
                    client.id === selectedClient?.id
                      ? 'rgba(139,92,246,0.08)'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (client.id !== selectedClient?.id) {
                    e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (client.id !== selectedClient?.id) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span
                  className="block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: client.color }}
                />
                <span className="truncate">{client.name}</span>
              </button>
            ))}
            <div
              className="border-t my-1"
              style={{ borderColor: 'rgba(139,92,246,0.12)' }}
            />
            <button
              onClick={() => {
                setOpen(false)
                router.push('/dashboard/clients')
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left"
              style={{ color: '#6366f1' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Tous les clients...
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- Normal mode ---
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
        style={{
          background: open ? 'rgba(139,92,246,0.08)' : 'transparent',
          border: '1px solid',
          borderColor: open ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)',
        }}
      >
        <span className="text-xs font-medium shrink-0" style={{ color: '#8898aa' }}>
          Client :
        </span>
        {selectedClient ? (
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedClient.color }}
            />
            <span className="truncate" style={{ color: '#e8edf5' }}>
              {selectedClient.name}
            </span>
          </span>
        ) : (
          <span className="italic truncate flex-1 text-left" style={{ color: '#3d4f63' }}>
            Sélectionner...
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8898aa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 py-1 rounded-lg border shadow-xl"
          style={{
            background: '#0f1117',
            borderColor: 'rgba(139,92,246,0.2)',
          }}
        >
          {pinnedClients.map((client) => (
            <button
              key={client.id}
              onClick={() => {
                setSelectedClientId(client.id)
                setOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left"
              style={{
                color: client.id === selectedClient?.id ? '#e8edf5' : '#8898aa',
                background:
                  client.id === selectedClient?.id
                    ? 'rgba(139,92,246,0.08)'
                    : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (client.id !== selectedClient?.id) {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
                }
              }}
              onMouseLeave={(e) => {
                if (client.id !== selectedClient?.id) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span
                className="block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: client.color }}
              />
              <span className="truncate">{client.name}</span>
            </button>
          ))}
          <div
            className="border-t my-1"
            style={{ borderColor: 'rgba(139,92,246,0.12)' }}
          />
          <button
            onClick={() => {
              setOpen(false)
              router.push('/dashboard/clients')
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors text-left"
            style={{ color: '#6366f1' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139,92,246,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Tous les clients...
          </button>
        </div>
      )}
    </div>
  )
}
