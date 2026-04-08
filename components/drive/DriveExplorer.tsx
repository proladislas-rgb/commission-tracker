'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import DriveFileRow from './DriveFileRow'
import type { DriveFile } from '@/lib/drive'

interface BreadcrumbItem {
  id: string
  name: string
}

interface DriveExplorerProps {
  attachMode?: boolean
  onAttachFile?: (file: DriveFile) => void
}

export default function DriveExplorer({ attachMode = false, onAttachFile }: DriveExplorerProps = {}) {
  const [folders, setFolders] = useState<DriveFile[]>([])
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mon Drive' },
  ])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drive/list?folderId=${folderId}`)
      if (!res.ok) {
        const data = await res.json() as { error: string }
        throw new Error(data.error)
      }
      const data = (await res.json()) as { folders: DriveFile[]; files: DriveFile[] }
      setFolders(data.folders)
      setFiles(data.files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
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

  const handleDeleteFolder = async (folderId: string) => {
    setDeletingFolderId(folderId)
    try {
      const res = await fetch(`/api/drive/delete?fileId=${folderId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Échec de la suppression')
      await fetchFiles(currentFolderId)
    } catch {
      // silently fail
    } finally {
      setDeletingFolderId(null)
      setConfirmDeleteFolderId(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/drive/upload?folderId=${currentFolderId}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        throw new Error(data.error)
      }

      await fetchFiles(currentFolderId)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (error === 'not_connected') {
    return null // parent handles this
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          {breadcrumb.map((item, i) => (
            <div key={item.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-txt3">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`transition-colors cursor-pointer ${
                  i === breadcrumb.length - 1
                    ? 'text-[#818cf8] font-medium'
                    : 'text-txt2 hover:text-txt'
                }`}
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#6366f1',
              color: '#e8edf5',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: 500,
            }}
            onMouseEnter={e => {
              if (!uploading) e.currentTarget.style.backgroundColor = '#818cf8'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#6366f1'
            }}
          >
            {uploading ? 'Upload en cours...' : 'Upload vers Drive'}
          </button>
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs mb-4" style={{ color: '#8898aa' }}>{uploadError}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
            />
            <span className="text-sm text-txt2">Chargement...</span>
          </div>
        </div>
      )}

      {/* Contenu */}
      {!loading && (
        <>
          {/* Dossiers */}
          {folders.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[1.5px] text-txt3 font-semibold mb-3">
                Dossiers ({folders.length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    className="relative text-left rounded-xl p-4 transition-all duration-200 group"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.boxShadow = 'none'
                      setConfirmDeleteFolderId(null)
                    }}
                  >
                    <button
                      onClick={() => navigateToFolder(folder)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-txt font-medium truncate">{folder.name}</p>
                          <p className="text-[11px] text-txt3">Dossier</p>
                        </div>
                      </div>
                    </button>

                    {/* Bouton supprimer dossier */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {confirmDeleteFolderId === folder.id ? (
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          disabled={deletingFolderId === folder.id}
                          className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                          style={{ backgroundColor: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}
                        >
                          {deletingFolderId === folder.id ? '...' : 'Confirmer'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteFolderId(folder.id)}
                          className="p-1.5 rounded-md hover:bg-[rgba(244,63,94,0.1)] transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fichiers */}
          {files.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[1.5px] text-txt3 font-semibold mb-3">
                Fichiers ({files.length})
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold">
                        Nom
                      </th>
                      <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold">
                        Modifié
                      </th>
                      <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold">
                        Taille
                      </th>
                      <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(file => (
                      <DriveFileRow
                        key={file.id}
                        file={file}
                        onDelete={() => fetchFiles(currentFolderId)}
                        attachMode={attachMode}
                        onAttach={onAttachFile}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vide */}
          {folders.length === 0 && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3d4f63" strokeWidth="1.5" className="mb-4">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              <p className="text-sm text-txt2">Ce dossier est vide</p>
            </div>
          )}

          {/* Erreur */}
          {error && error !== 'not_connected' && (
            <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <p className="text-sm text-rose">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
