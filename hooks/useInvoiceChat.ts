'use client'

import { useState, useCallback } from 'react'
import type { InvoiceData } from '@/lib/invoice-template'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  invoiceData?: InvoiceData
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Bonjour ! Donnez-moi les infos de la facture à générer : numéro, montant, date et échéance.',
}

export function useInvoiceChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string, clientContext?: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Afficher seulement le texte propre dans le chat
    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)

    // Envoyer le texte + contexte client (invisible) à l'API
    const messageForApi = clientContext ? trimmed + clientContext : trimmed

    try {
      // Construire l'historique sans le message de bienvenue et sans invoiceData
      const history = messages
        .filter((_, i) => i > 0) // skip welcome
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/invoice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageForApi, history }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Erreur ${res.status}`)
      }

      const parsed = await res.json()

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: parsed.text ?? '',
      }

      if (parsed.type === 'invoice' && parsed.data) {
        assistantMsg.invoiceData = {
          invoiceNumber: String(parsed.data.invoiceNumber ?? ''),
          invoiceDate: String(parsed.data.invoiceDate ?? ''),
          dueDate: String(parsed.data.dueDate ?? ''),
          paymentTerms: String(parsed.data.paymentTerms ?? ''),
          amount: Number(parsed.data.amount) || 0,
        }
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur : ${msg}` }])
    } finally {
      setLoading(false)
    }
  }, [messages])

  return { messages, sendMessage, loading, error }
}
