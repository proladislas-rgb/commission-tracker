'use client'

import { Client } from '@/lib/types'

interface Props {
  client: Client
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (client: Client) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

export default function ClientCard({
  client,
  isSelected,
  onSelect,
  onEdit,
  onTogglePin,
  onDelete,
}: Props) {
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (window.confirm(`Supprimer le client « ${client.name} » ? Cette action est irréversible.`)) {
      onDelete(client.id)
    }
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    onEdit(client)
  }

  function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation()
    onTogglePin(client.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(client.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(client.id)
        }
      }}
      className="group relative overflow-hidden rounded-[20px] p-5 cursor-pointer transition-all duration-200"
      style={{
        background: '#0e0d1a',
        border: isSelected
          ? `2px solid ${client.color}`
          : '1px solid rgba(139,92,246,0.12)',
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${client.color}, ${client.color}88)`,
        }}
      />

      {/* Action buttons — visible on hover */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Pin / Unpin */}
        <button
          onClick={handleTogglePin}
          className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[#f59e0b]/15"
          title={client.pinned ? 'Désépingler' : 'Épingler'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-4 h-4 transition-colors duration-150"
            fill={client.pinned ? '#f59e0b' : 'none'}
            stroke={client.pinned ? '#f59e0b' : '#8898aa'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        {/* Edit */}
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[#6366f1]/15"
          title="Modifier"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="#8898aa"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[#f43f5e]/15"
          title="Supprimer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="#8898aa"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      {/* Card content */}
      <div className="flex items-start gap-3 mt-1">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: client.color }}
        />

        <div className="min-w-0 flex-1">
          {/* Name */}
          <p className="font-semibold text-[#e8edf5] truncate text-[15px] leading-tight">
            {client.name}
          </p>

          {/* SIREN */}
          {client.siren && (
            <p className="text-[#8898aa] text-xs mt-1.5 font-mono">
              SIREN {client.siren}
            </p>
          )}

          {/* Address */}
          {client.address && (
            <p className="text-[#3d4f63] text-xs mt-1 truncate">
              {client.address}
            </p>
          )}

          {/* Email */}
          {client.email && (
            <p className="text-[#3d4f63] text-xs mt-0.5 truncate">
              {client.email}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
