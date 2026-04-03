'use client'

import { useState, useRef, useEffect } from 'react'
import DriveFilePicker from './DriveFilePicker'

interface Attachment {
  type: 'drive' | 'local'
  fileId?: string
  fileName: string
  mimeType: string
  data?: string // base64 for local
  size?: number
}

interface EmailComposerProps {
  initialAttachments?: Attachment[]
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

export default function EmailComposer({ initialAttachments = [], onSent }: EmailComposerProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialAttachments.length > 0) {
      setAttachments(initialAttachments)
    }
  }, [initialAttachments])

  const addDriveFile = (file: { fileId: string; fileName: string; mimeType: string }) => {
    setAttachments(prev => [
      ...prev,
      { type: 'drive', fileId: file.fileId, fileName: file.fileName, mimeType: file.mimeType },
    ])
    setShowDrivePicker(false)
  }

  const addLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return

    Array.from(fileList).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachments(prev => [
          ...prev,
          {
            type: 'local',
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            data: base64,
            size: file.size,
          },
        ])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setStatus({ type: 'error', message: 'Remplissez tous les champs obligatoires' })
      return
    }

    setSending(true)
    setStatus(null)

    try {
      const payload = {
        to,
        subject,
        body: body.replace(/\n/g, '<br>'),
        attachments: attachments.map(att =>
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
        setTo('')
        setSubject('')
        setBody('')
        setAttachments([])
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

  const reset = () => {
    setTo('')
    setSubject('')
    setBody('')
    setAttachments([])
    setStatus(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2
          className="text-base font-semibold text-txt"
        >
          Nouveau message
        </h2>
      </div>

      {/* Champs */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4 gap-3">
        {/* Destinataire */}
        <div>
          <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Destinataire
          </label>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
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
          <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Objet
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
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
          <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-1.5 block">
            Message
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Rédigez votre message..."
            className="w-full flex-1 px-3 py-2 rounded-lg text-sm text-txt placeholder-txt3 outline-none resize-none transition-all duration-200"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              minHeight: '300px',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          />
        </div>

        {/* Pièces jointes */}
        {attachments.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-[1.2px] text-txt3 font-semibold mb-2 block">
              Pièces jointes ({attachments.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div
                  key={`${att.fileName}-${i}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Icône type */}
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold"
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

                  {/* Badge source */}
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                    style={{
                      backgroundColor: att.type === 'drive' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                      color: att.type === 'drive' ? '#f59e0b' : '#22c55e',
                    }}
                  >
                    {att.type === 'drive' ? 'Drive' : 'Local'}
                  </span>

                  {/* Supprimer */}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-0.5 rounded hover:bg-[rgba(244,63,94,0.1)] transition-colors cursor-pointer"
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

        {/* Boutons pièces jointes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDrivePicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-txt2 transition-all duration-200 cursor-pointer"
            style={{
              backgroundColor: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.12)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.12)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            Depuis Drive
          </button>

          <button
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

        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm text-txt2 hover:text-txt hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200 cursor-pointer"
        >
          Annuler
        </button>
      </div>

      {/* Drive Picker Modal */}
      {showDrivePicker && (
        <DriveFilePicker
          onSelect={addDriveFile}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </div>
  )
}
