'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  className?: string
  inputClassName?: string
  disabled?: boolean
  placeholder?: string
}

export default function InlineEdit({
  value,
  onSave,
  className,
  inputClassName,
  disabled = false,
  placeholder,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function commit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) { cancel(); return }
    setSaving(true)
    try {
      await onSave(trimmed)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter')  commit()
    if (e.key === 'Escape') cancel()
  }

  if (!editing) {
    return (
      <span
        className={cn(
          !disabled && 'cursor-pointer hover:text-indigo2 transition-colors',
          className
        )}
        onClick={() => { if (!disabled) setEditing(true) }}
        title={!disabled ? 'Cliquer pour renommer' : undefined}
      >
        {value || placeholder}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      disabled={saving}
      className={cn(
        'bg-raised border border-indigo rounded-btn px-2 py-0.5 text-sm text-txt outline-none',
        'focus:ring-1 focus:ring-indigo/30 min-w-[120px]',
        inputClassName
      )}
    />
  )
}
