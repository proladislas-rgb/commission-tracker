'use client'

import { useState, useRef, type FormEvent } from 'react'

interface AgentInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function AgentInput({ onSend, disabled }: AgentInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '12px 24px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: '#0f1117',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Demandez a Reem... (donnees, synthese, fichiers, ou juste discuter)"
        disabled={disabled}
        style={{
          flex: 1,
          background: '#151a24',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#e8edf5',
          fontSize: '13px',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: disabled || !value.trim() ? 0.5 : 1,
          transition: 'transform 0.15s, opacity 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  )
}
