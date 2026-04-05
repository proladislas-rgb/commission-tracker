'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ChatUser {
  id: string
  display_name: string
}

interface ChatInputProps {
  onSend: (content: string) => void
  onTyping: () => void
  onFileUpload: (file: File) => void
  disabled?: boolean
  users?: ChatUser[]
}

export default function ChatInput({ onSend, onTyping, onFileUpload, disabled, users = [] }: ChatInputProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Voice recording
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Mentions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredUsers = mentionQuery !== null
    ? users.filter(u => u.display_name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : []

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
    setMentionQuery(null)
  }, [text, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention navigation
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % filteredUsers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setMentionQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function insertMention(user: ChatUser) {
    const atIndex = text.lastIndexOf('@')
    if (atIndex === -1) return
    const before = text.slice(0, atIndex)
    const newText = `${before}@${user.display_name} `
    setText(newText)
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setText(val)
    onTyping()

    // Check for @ mention
    const atIndex = val.lastIndexOf('@')
    if (atIndex !== -1) {
      const charBefore = val[atIndex - 1]
      if (atIndex === 0 || charBefore === ' ') {
        const query = val.slice(atIndex + 1)
        if (!query.includes(' ')) {
          setMentionQuery(query)
          setMentionIndex(0)
          return
        }
      }
    }
    setMentionQuery(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // --- Voice recording ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' })
        onFileUpload(file)
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      // Micro non disponible
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function cancelRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    chunksRef.current = []
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function formatRecordingTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Mention autocomplete dropdown */}
      {mentionQuery !== null && filteredUsers.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '12px', right: '12px',
          backgroundColor: '#151a24', border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', padding: '4px', marginBottom: '4px',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.4)', zIndex: 20,
        }}>
          {filteredUsers.map((u, i) => (
            <button
              key={u.id}
              onClick={() => insertMention(u)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                backgroundColor: i === mentionIndex ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: '#e8edf5', fontSize: '12px', textAlign: 'left',
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <span style={{ color: '#6366f1', fontWeight: 600 }}>@</span>
              {u.display_name}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderTop: '0.5px solid rgba(255,255,255,0.07)', backgroundColor: '#0f1117' }}>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {recording ? (
          /* Recording UI */
          <>
            <button
              onClick={cancelRecording}
              style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
              title="Annuler"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#151a24', border: '0.5px solid rgba(243,63,94,0.3)',
              borderRadius: '8px', padding: '8px 12px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: '#f43f5e', fontSize: '12px', fontWeight: 500 }}>
                {formatRecordingTime(recordingTime)}
              </span>
              <span style={{ color: '#8898aa', fontSize: '11px' }}>Enregistrement en cours...</span>
            </div>

            <button
              onClick={stopRecording}
              style={{
                backgroundColor: '#10b981', border: 'none', borderRadius: '8px',
                padding: '7px 14px', color: '#fff', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Envoyer
            </button>
          </>
        ) : (
          /* Normal UI */
          <>
            {/* Trombone */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: 'transparent', border: 'none', color: '#8898aa', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#818cf8' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8898aa' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* Micro */}
            <button
              onClick={startRecording}
              style={{ background: 'transparent', border: 'none', color: '#8898aa', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#10b981' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8898aa' }}
              title="Message vocal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message... (@mention)"
              disabled={disabled}
              className="outline-none"
              style={{
                flex: 1,
                backgroundColor: '#151a24',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#e8edf5',
                fontSize: '12px',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            />

            {/* Envoyer */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || disabled}
              className="disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                color: '#e8edf5',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (text.trim()) e.currentTarget.style.backgroundColor = '#818cf8' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#6366f1' }}
            >
              Envoyer
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
