'use client'

import { useRef, useEffect, useState, useCallback, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useInvoiceChat } from '@/hooks/useInvoiceChat'
import { avatarInitials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import InvoicePreview from './InvoicePreview'

export default function InvoiceChat() {
  const { user } = useAuth()
  const { messages, sendMessage, loading } = useInvoiceChat()
  const [input, setInput] = useState('')
  const [associeId, setAssocieId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadAssocieId = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'associe')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (data) setAssocieId(data.id)
    } catch {
      // pas d'associé trouvé
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data from Supabase
  useEffect(() => { loadAssocieId() }, [loadAssocieId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  function handleModify() {
    setInput('Modifier la facture : ')
    inputRef.current?.focus()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleInjected(_message: string) {
    // Confirmation affichée via le badge vert sur la carte InvoicePreview
  }

  return (
    <div
      className="rounded-[14px] border border-[rgba(255,255,255,0.07)] flex flex-col"
      style={{ backgroundColor: '#0f1117', height: 'calc(100vh - 200px)', minHeight: '500px' }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="flex gap-2.5 animate-fadeIn"
            style={{
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            {msg.role === 'assistant' ? (
              <div className="w-7 h-7 rounded-lg bg-indigo flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white">F</span>
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                style={{ backgroundColor: user?.avatar_color ?? '#6366f1' }}
              >
                {user ? avatarInitials(user.display_name) : '?'}
              </div>
            )}

            {/* Contenu */}
            <div
              style={{
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Bulle texte */}
              {msg.content && (
                <div
                  className="text-sm leading-relaxed"
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                    backgroundColor: msg.role === 'user'
                      ? 'rgba(99,102,241,0.12)'
                      : '#0f1117',
                    border: msg.role === 'user'
                      ? '1px solid rgba(99,102,241,0.25)'
                      : '1px solid rgba(255,255,255,0.07)',
                    color: '#e8edf5',
                  }}
                >
                  {msg.content}
                </div>
              )}

              {/* Aperçu facture */}
              {msg.invoiceData && (
                <InvoicePreview
                  data={msg.invoiceData}
                  associeId={associeId}
                  onModify={handleModify}
                  onInjected={handleInjected}
                />
              )}
            </div>
          </div>
        ))}

        {/* Indicateur de frappe */}
        {loading && (
          <div className="flex gap-2.5 items-start animate-fadeIn">
            <div className="w-7 h-7 rounded-lg bg-indigo flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">F</span>
            </div>
            <div
              className="text-sm text-txt3 px-3.5 py-2.5 rounded-[14px] border border-[rgba(255,255,255,0.07)]"
              style={{ backgroundColor: '#0f1117' }}
            >
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-txt3 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-txt3 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-txt3 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-[rgba(255,255,255,0.07)] flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ex : Facture N4, 3000€, aujourd'hui, Net 30 days..."
          disabled={loading}
          className="flex-1 bg-raised border border-[rgba(255,255,255,0.07)] rounded-btn px-3 py-2 text-sm text-txt placeholder-txt3 outline-none focus:border-indigo/50 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-btn bg-indigo text-white text-sm font-medium hover:bg-indigo/80 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}
