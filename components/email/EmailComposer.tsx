'use client'

import { useState, useRef } from 'react'
import type { Draft, Attachment } from '@/lib/workspace'

interface EmailComposerProps {
  draft: Draft
  onDraftChange: (next: Draft) => void
  onSent?: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeColor(mimeType: string): string {
  if (mimeType.includes('pdf')) return '#f43f5e'
  if (mimeType.includes('document') || mimeType.includes('word')) return '#38bdf8'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '#10b981'
  if (mimeType.includes('image')) return '#818cf8'
  return '#8898aa'
}

export default function EmailComposer({ draft, onDraftChange, onSent }: EmailComposerProps) {
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<Draft>) => onDraftChange({ ...draft, ...patch })

  const addLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    const files = Array.from(fileList)
    const baseAttachments = draft.attachments  // snapshot at user action time
    let pending = files.length
    const collected: Attachment[] = []

    const finalize = () => {
      pending -= 1
      if (pending === 0) {
        onDraftChange({ ...draft, attachments: [...baseAttachments, ...collected] })
      }
    }

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        collected.push({
          type: 'local',
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64,
          size: file.size,
        })
        finalize()
      }
      reader.onerror = () => {
        // Si un fichier échoue, on continue sans bloquer le batch
        finalize()
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    update({ attachments: draft.attachments.filter((_, i) => i !== index) })
  }

  const handleSend = async () => {
    if (!draft.to || !draft.subject || !draft.body) {
      setStatus({ type: 'error', message: 'Remplissez tous les champs obligatoires' })
      return
    }

    setSending(true)
    setStatus(null)

    try {
      const payload = {
        to: draft.to,
        subject: draft.subject,
        body: draft.body.replace(/\n/g, '<br>'),
        attachments: draft.attachments.map(att =>
          att.type === 'drive'
            ? { type: 'drive' as const, fileId: att.fileId!, fileName: att.fileName, mimeType: att.mimeType }
            : { type: 'local' as const, data: att.data!, fileName: att.fileName, mimeType: att.mimeType }
        ),
      }

      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setStatus({ type: 'success', message: 'Email envoyé avec succès !' })
        onSent?.()
      } else {
        const data = (await res.json()) as { error: string }
        setStatus({ type: 'error', message: data.error || 'Erreur lors de l\'envoi' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Erreur réseau' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Champs */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4 gap-3">
        {/* Destinataire */}
        <div>
          <label htmlFor="composer-to" className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Destinataire
          </label>
          <input
            id="composer-to"
            type="email"
            value={draft.to}
            onChange={e => update({ to: e.target.value })}
            placeholder="email@exemple.com"
            className="w-full px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Objet */}
        <div>
          <label htmlFor="composer-subject" className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Objet
          </label>
          <input
            id="composer-subject"
            type="text"
            value={draft.subject}
            onChange={e => update({ subject: e.target.value })}
            placeholder="Objet de l'email"
            className="w-full px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Message */}
        <div className="flex-1 flex flex-col min-h-0">
          <label htmlFor="composer-body" className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Message
          </label>
          <textarea
            id="composer-body"
            value={draft.body}
            onChange={e => update({ body: e.target.value })}
            placeholder="Rédigez votre message..."
            className="w-full flex-1 px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none resize-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              minHeight: '180px',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Pièces jointes */}
        {draft.attachments.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-2 block">
              Pièces jointes ({draft.attachments.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {draft.attachments.map((att, i) => (
                <div
                  key={`${att.fileName}-${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ color: getTypeColor(att.mimeType) }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>

                  <span className="text-txt2 truncate max-w-[140px]">{att.fileName}</span>

                  {att.size && (
                    <span className="text-txt3">{formatSize(att.size)}</span>
                  )}

                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                    style={{
                      backgroundColor: att.type === 'drive' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                      color: att.type === 'drive' ? '#f59e0b' : '#22c55e',
                    }}
                  >
                    {att.type === 'drive' ? 'Drive' : 'Local'}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="p-0.5 rounded hover:bg-[rgba(244,63,94,0.1)] transition-colors cursor-pointer"
                    aria-label="Supprimer la pièce jointe"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8898aa" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton ajout PJ locale (Drive géré depuis l'explorateur principal) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-txt2 transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.12)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.12)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Depuis mon PC
          </button>
          <span className="text-[10px] text-txt3 ml-1">
            (clic sur un fichier Drive à gauche pour l&apos;attacher)
          </span>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={addLocalFiles}
          />
        </div>

        {/* Status */}
        {status && (
          <div
            className="rounded-lg px-4 py-2.5 text-sm"
            style={{
              backgroundColor: status.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)'}`,
              color: status.type === 'success' ? '#22c55e' : '#f43f5e',
            }}
          >
            {status.message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            if (!sending) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)'
          }}
        >
          {sending ? (
            <>
              <div
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }}
              />
              Envoi...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Envoyer
            </>
          )}
        </button>
      </div>
    </div>
  )
}
