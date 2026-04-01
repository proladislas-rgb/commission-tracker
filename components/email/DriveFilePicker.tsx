'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
}

interface BreadcrumbItem {
  id: string
  name: string
}

interface DriveFilePickerProps {
  onSelect: (file: { fileId: string; fileName: string; mimeType: string }) => void
  onClose: () => void
}

export default function DriveFilePicker({ onSelect, onClose }: DriveFilePickerProps) {
  const [folders, setFolders] = useState<DriveFile[]>([])
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mon Drive' },
  ])

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/drive/list?folderId=${folderId}`)
      if (res.ok) {
        const data = (await res.json()) as { folders: DriveFile[]; files: DriveFile[] }
        setFolders(data.folders)
        setFiles(data.files)
      }
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles(currentFolderId)
  }, [currentFolderId, fetchFiles])

  const navigateToFolder = (folder: DriveFile) => {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumb(prev => prev.slice(0, index + 1))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: '560px',
          maxHeight: '500px',
          backgroundColor: '#0e0d1a',
          border: '1px solid rgba(139,92,246,0.15)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          animation: 'modalIn 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
        >
          <div>
            <h3 className="text-sm font-semibold text-txt" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Choisir un fichier Drive
            </h3>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {breadcrumb.map((item, i) => (
                <span key={item.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-txt3">/</span>}
                  <button
                    onClick={() => navigateToBreadcrumb(i)}
                    className={`cursor-pointer transition-colors ${
                      i === breadcrumb.length - 1 ? 'text-[#8b5cf6]' : 'text-txt3 hover:text-txt2'
                    }`}
                  >
                    {item.name}
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgba(139,92,246,0.1)] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b85a8" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: '200px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : (
            <div className="space-y-1">
              {/* Dossiers */}
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-[rgba(139,92,246,0.06)]"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-txt truncate">{folder.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4466" strokeWidth="2" className="ml-auto flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}

              {/* Fichiers */}
              {files.map(file => (
                <button
                  key={file.id}
                  onClick={() => onSelect({ fileId: file.id, fileName: file.name, mimeType: file.mimeType })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:bg-[rgba(139,92,246,0.06)]"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                    style={{
                      backgroundColor: file.mimeType.includes('pdf') ? 'rgba(244,63,94,0.12)' :
                        file.mimeType.includes('document') ? 'rgba(56,189,248,0.12)' :
                        file.mimeType.includes('spreadsheet') ? 'rgba(16,185,129,0.12)' :
                        'rgba(139,133,168,0.12)',
                      color: file.mimeType.includes('pdf') ? '#f43f5e' :
                        file.mimeType.includes('document') ? '#38bdf8' :
                        file.mimeType.includes('spreadsheet') ? '#10b981' :
                        '#8b85a8',
                    }}
                  >
                    {file.mimeType.includes('pdf') ? 'PDF' :
                      file.mimeType.includes('document') ? 'DOC' :
                      file.mimeType.includes('spreadsheet') ? 'XLS' :
                      file.mimeType.includes('image') ? 'IMG' : 'FIC'}
                  </div>
                  <span className="text-sm text-txt truncate">{file.name}</span>
                </button>
              ))}

              {folders.length === 0 && files.length === 0 && (
                <p className="text-sm text-txt3 text-center py-8">Dossier vide</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
