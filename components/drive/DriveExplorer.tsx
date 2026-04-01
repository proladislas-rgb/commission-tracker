'use client'

import { useEffect, useState, useCallback } from 'react'
import DriveFileRow from './DriveFileRow'

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

export default function DriveExplorer() {
  const [folders, setFolders] = useState<DriveFile[]>([])
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mon Drive' },
  ])

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
                    ? 'text-[#8b5cf6] font-medium'
                    : 'text-txt2 hover:text-txt'
                }`}
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'transparent' }}
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
                  <button
                    key={folder.id}
                    onClick={() => navigateToFolder(folder)}
                    className="text-left rounded-xl p-4 transition-all duration-200 cursor-pointer group"
                    style={{
                      backgroundColor: 'rgba(139,92,246,0.04)',
                      border: '1px solid rgba(139,92,246,0.08)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.08)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.04)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
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
                  border: '1px solid rgba(139,92,246,0.08)',
                  backgroundColor: 'rgba(139,92,246,0.02)',
                }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(139,92,246,0.06)' }}>
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
                      <DriveFileRow key={file.id} file={file} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vide */}
          {folders.length === 0 && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4a4466" strokeWidth="1.5" className="mb-4">
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
