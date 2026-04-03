'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EmailComposer from '@/components/email/EmailComposer'

interface Attachment {
  type: 'drive' | 'local'
  fileId?: string
  fileName: string
  mimeType: string
  data?: string
  size?: number
}

function EmailPageContent() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
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
    check()
  }, [])

  // Pré-attacher depuis Drive (query params) — dérivé, pas d'effet
  const initialAttachments = useMemo<Attachment[]>(() => {
    const attachFileId = searchParams.get('attach')
    const attachName = searchParams.get('name')
    const attachMime = searchParams.get('mime')
    if (attachFileId && attachName) {
      return [{
        type: 'drive',
        fileId: attachFileId,
        fileName: attachName,
        mimeType: attachMime ?? 'application/octet-stream',
      }]
    }
    return []
  }, [searchParams])

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col">
      {/* Header */}
      <div className="px-6 md:px-10 pt-6 pb-4">
        <h1
          className="text-2xl font-bold text-txt mb-1"
        >
          Email
        </h1>
        <p className="text-sm text-txt2">
          Envoyez des emails avec pièces jointes depuis Google Drive
        </p>
      </div>

      {/* Chargement */}
      {connected === null && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
            />
            <span className="text-sm text-txt2">Vérification de la connexion Gmail...</span>
          </div>
        </div>
      )}

      {/* Non connecté */}
      {connected === false && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-txt mb-2">
            Connectez Gmail
          </h2>
          <p className="text-sm text-txt2 mb-6 text-center max-w-md">
            Envoyez des emails avec pièces jointes directement depuis l&apos;application.
          </p>
          <a
            href="/api/auth/google?redirect=/dashboard/email"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Connecter Gmail
          </a>
        </div>
      )}

      {/* Connecté — Composeur pleine largeur */}
      {connected === true && (
        <div
          className="flex-1 flex flex-col mx-6 md:mx-10 mb-6 overflow-hidden rounded-xl"
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <EmailComposer initialAttachments={initialAttachments} />
        </div>
      )}
    </div>
  )
}

export default function EmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
        />
      </div>
    }>
      <EmailPageContent />
    </Suspense>
  )
}
