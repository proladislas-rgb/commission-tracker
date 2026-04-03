'use client'

import { useState, useCallback, useRef } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  onTyping: () => void
  onFileUpload: (file: File) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, onTyping, onFileUpload, disabled }: ChatInputProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(() => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText('')
  }, [text, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    onTyping()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderTop: '0.5px solid rgba(255,255,255,0.07)', backgroundColor: '#0f1117' }}>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

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

      {/* Input */}
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Écrire un message..."
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
    </div>
  )
}
