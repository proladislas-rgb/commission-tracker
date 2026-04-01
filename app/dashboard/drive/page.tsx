'use client'

import { useEffect, useState } from 'react'
import DriveExplorer from '@/components/drive/DriveExplorer'

export default function DrivePage() {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch('/api/drive/list?folderId=root')
        if (res.ok) {
          setConnected(true)
        } else {
          const data = (await res.json()) as { error: string }
          setConnected(data.error !== 'not_connected')
        }
      } catch {
        setConnected(false)
      }
    }
    checkConnection()
  }, [])

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Titre */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-txt mb-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Google Drive
        </h1>
        <p className="text-sm text-txt2">
          Parcourez et téléchargez vos fichiers depuis Google Drive
        </p>
      </div>

      {/* Chargement initial */}
      {connected === null && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'transparent' }}
            />
            <span className="text-sm text-txt2">Vérification de la connexion Google...</span>
          </div>
        </div>
      )}

      {/* Non connecté */}
      {connected === false && (
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-txt mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Connectez votre Google Drive
          </h2>
          <p className="text-sm text-txt2 mb-6 text-center max-w-md">
            Accédez à vos fichiers, téléchargez des documents et envoyez des factures directement depuis l&apos;application.
          </p>
          <a
            href="/api/auth/google?redirect=/dashboard/drive"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 25px rgba(139,92,246,0.5)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(139,92,246,0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Connecter Google Drive
          </a>
        </div>
      )}

      {/* Connecté → Explorer */}
      {connected === true && <DriveExplorer />}
    </div>
  )
}
