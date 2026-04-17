'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DriveExplorer from '@/components/drive/DriveExplorer'
import EmailDrawer from '@/components/workspace/EmailDrawer'
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader'
import { useDraftPersistence } from '@/hooks/useDraftPersistence'
import { hasContent, type DriveAttachment } from '@/lib/workspace'
import type { DriveFile } from '@/lib/drive'

function WorkspaceContent() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [restoredToast, setRestoredToast] = useState(false)
  const { draft, setDraft, clearDraft, restored } = useDraftPersistence()

  // Check connexion Google (une seule fois)
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/drive/list?folderId=root')
        if (res.ok) {
          setConnected(true)
          return
        }
        // Any 401 (not_connected, invalid_tokens, token_expired, refresh_failed)
        // means the user must reconnect Google — including after a Google password change
        // which revokes refresh tokens when the Gmail scope is present.
        if (res.status === 401) {
          setConnected(false)
          return
        }
        // Other errors (500, Drive API down) — assume still connected to avoid
        // false-positive reconnect prompts, but the feature will show its own error.
        setConnected(true)
      } catch {
        setConnected(false)
      }
    }
    check()
  }, [])

  // Restauration brouillon → ouvrir le tiroir + toast
  useEffect(() => {
    if (restored) {
      // Sync au mount depuis localStorage : pattern légitime, pas dérivable
      // car drawerOpen et restoredToast ont d'autres sources de mutation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawerOpen(true)
      setRestoredToast(true)
      const t = setTimeout(() => setRestoredToast(false), 4000)
      return () => clearTimeout(t)
    }
  }, [restored])

  // Pré-remplissage depuis query params (Reem AI ou ancien lien Drive)
  // S'exécute après le mount ; ne déclenche pas si le brouillon a déjà été restauré.
  useEffect(() => {
    if (restored) return
    const attachFileId = searchParams.get('attach')
    const attachName = searchParams.get('name')
    const attachMime = searchParams.get('mime')
    const to = searchParams.get('to') ?? ''
    const subject = searchParams.get('subject') ?? ''
    const body = searchParams.get('body') ?? ''

    const attachments: DriveAttachment[] = []
    if (attachFileId && attachName) {
      attachments.push({
        type: 'drive',
        fileId: attachFileId,
        fileName: attachName,
        mimeType: attachMime ?? 'application/octet-stream',
      })
    }

    if (attachments.length > 0 || to || subject || body) {
      // Sync depuis l'URL : pattern légitime pour absorber les query params
      // au mount (Reem AI ou ancien lien Drive). Pas dérivable en derived state
      // car drawerOpen a aussi des sources de mutation manuelles (✕, envoi).
      setDraft({ to, subject, body, attachments })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawerOpen(true)
    }
  }, [searchParams, restored, setDraft])

  const attachFileFromDrive = useCallback((file: DriveFile) => {
    const newAttachment: DriveAttachment = {
      type: 'drive',
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
    }
    setDraft(prev => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment],
    }))
    setDrawerOpen(true)
  }, [setDraft])

  const handleSent = useCallback(() => {
    clearDraft()
    setDrawerOpen(false)
  }, [clearDraft])

  const handleDiscard = useCallback(() => {
    clearDraft()
    setDrawerOpen(false)
  }, [clearDraft])

  // Loading
  if (connected === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
          />
          <span className="text-sm text-txt2">Vérification de la connexion Google...</span>
        </div>
      </div>
    )
  }

  // Non connecté
  if (connected === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-txt mb-2">
          Connectez Google
        </h2>
        <p className="text-sm text-txt2 mb-6 text-center max-w-md">
          Accédez à vos fichiers Drive et envoyez des emails depuis l&apos;application.
        </p>
        <a
          href="/api/auth/google?redirect=/dashboard/workspace"
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
          Connecter Google
        </a>
      </div>
    )
  }

  // Connecté
  return (
    <div className="min-h-screen flex flex-col">
      <WorkspaceHeader
        hasDraft={hasContent(draft)}
        attachmentCount={draft.attachments.length}
        drawerOpen={drawerOpen}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <div className="flex-1 px-6 md:px-10 pb-10">
        <DriveExplorer
          attachMode={drawerOpen}
          onAttachFile={attachFileFromDrive}
        />
      </div>

      <EmailDrawer
        open={drawerOpen}
        draft={draft}
        onDraftChange={setDraft}
        onClose={() => setDrawerOpen(false)}
        onSent={handleSent}
        onDiscard={handleDiscard}
      />

      {/* Toast de restauration */}
      {restoredToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#151a24',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#e8edf5',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          📝 Brouillon restauré
        </div>
      )}
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
        />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}
