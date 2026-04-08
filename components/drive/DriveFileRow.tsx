'use client'

import { useState } from 'react'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
}

interface DriveFileRowProps {
  file: DriveFile
  onDelete?: () => void
  attachMode?: boolean
  onAttach?: (file: DriveFile) => void
}

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  'application/pdf': { color: '#f43f5e', label: 'PDF' },
  'application/vnd.google-apps.document': { color: '#38bdf8', label: 'Doc' },
  'application/vnd.google-apps.spreadsheet': { color: '#10b981', label: 'Sheet' },
  'application/vnd.google-apps.presentation': { color: '#f59e0b', label: 'Slides' },
  'image/': { color: '#818cf8', label: 'Image' },
  'video/': { color: '#f43f5e', label: 'Vidéo' },
}

function getTypeStyle(mimeType: string): { color: string; label: string } {
  if (TYPE_STYLES[mimeType]) return TYPE_STYLES[mimeType]
  for (const [prefix, style] of Object.entries(TYPE_STYLES)) {
    if (mimeType.startsWith(prefix)) return style
  }
  return { color: '#8898aa', label: 'Fichier' }
}

function formatSize(bytes: string | undefined): string {
  if (!bytes) return '—'
  const n = Number(bytes)
  if (n === 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export default function DriveFileRow({ file, onDelete, attachMode = false, onAttach }: DriveFileRowProps) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const style = getTypeStyle(file.mimeType)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/drive/delete?fileId=${file.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression')
      onDelete?.()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const openInDrive = () => {
    window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank')
  }

  const download = () => {
    window.open(`/api/drive/download?fileId=${file.id}`, '_blank')
  }

  return (
    <tr
      className="group transition-colors duration-150"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Nom + icône */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: `${style.color}20`, color: style.color }}
          >
            {style.label.slice(0, 3)}
          </div>
          <span className="text-sm text-txt truncate max-w-[300px]">{file.name}</span>
        </div>
      </td>

      {/* Date */}
      <td className="py-3 px-4">
        <span className="text-xs text-txt2">{formatDate(file.modifiedTime)}</span>
      </td>

      {/* Taille */}
      <td className="py-3 px-4">
        <span className="text-xs text-txt2">{formatSize(file.size)}</span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {/* Ouvrir */}
          <button
            onClick={openInDrive}
            className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title="Ouvrir dans Drive"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>

          {/* Télécharger */}
          <button
            onClick={download}
            className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title="Télécharger"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          {attachMode && onAttach && (
            <button
              type="button"
              onClick={() => onAttach(file)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(99,102,241,0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.15)' }}
              title="Joindre au brouillon en cours"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
              Joindre
            </button>
          )}

          {/* Envoyer par email */}
          <button
            onClick={() => {
              window.location.href = `/dashboard/workspace?attach=${file.id}&name=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.mimeType)}`
            }}
            className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.07)] transition-colors cursor-pointer"
            title="Envoyer par email"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>

          {/* Supprimer */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-md hover:bg-[rgba(244,63,94,0.1)] transition-colors cursor-pointer"
              title="Supprimer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
            >
              {deleting ? '...' : 'Confirmer'}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
