'use client'

import { useState, useMemo } from 'react'

/* ── Types ── */
interface ToolDataItem {
  type: string
  result: unknown
}

interface AgentMessageProps {
  role: 'user' | 'assistant'
  content: string | null
  toolData: ToolDataItem[] | null
  userName?: string
  userInitials?: string
  onConfirm?: (action: string, data: Record<string, unknown>) => Promise<boolean>
}

/* ── Colonnes internes a masquer ── */
const SKIP_COLS = new Set(['id', 'user_id', 'created_by', 'client_id', 'updated_at', 'created_at'])

/* ── DataCard ── */
function DataCard({ result }: { result: unknown }) {
  const rows = useMemo(() => Array.isArray(result) ? (result as Record<string, unknown>[]) : [], [result])
  const columns = useMemo(() => {
    if (rows.length === 0) return []
    return Object.keys(rows[0]).filter(k => !SKIP_COLS.has(k))
  }, [rows])

  if (rows.length === 0) return null
  const display = rows.slice(0, 10)

  return (
    <div style={{
      background: '#0f1117',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginTop: '6px',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#8898aa',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
        {rows.length} {rows.length > 1 ? 'resultats' : 'resultat'}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{
                  textAlign: 'left',
                  padding: '8px 14px',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: '#3d4f63',
                  fontWeight: 600,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '8px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    color: '#e8edf5',
                  }}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── ConfirmCard ── */
function ConfirmCard({ result, onConfirm }: { result: unknown; onConfirm?: (action: string, data: Record<string, unknown>) => Promise<boolean> }) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending')
  const data = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>
  const action = typeof data.action === 'string' ? data.action : 'create'
  const fields = Object.entries(data).filter(([k]) => !SKIP_COLS.has(k) && k !== 'action')

  const handleConfirm = async () => {
    if (!onConfirm) return
    const ok = await onConfirm(action, data)
    setStatus(ok ? 'confirmed' : 'pending')
  }

  if (status === 'confirmed') {
    return (
      <div style={{
        background: '#0f1117',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '10px',
        padding: '14px',
        marginTop: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#22c55e',
        fontWeight: 600,
      }}>
        <span style={{ fontSize: '16px' }}>&#10003;</span> Cree avec succes
      </div>
    )
  }

  if (status === 'cancelled') return null

  return (
    <div style={{
      background: '#0f1117',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: '10px',
      padding: '14px',
      marginTop: '6px',
    }}>
      <h4 style={{
        fontSize: '12px',
        fontWeight: 600,
        color: '#f59e0b',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        &#9888;&#65039; Confirmer la creation
      </h4>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '12px',
      }}>
        {fields.map(([key, val]) => (
          <div key={key}>
            <label style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#3d4f63',
            }}>
              {key}
            </label>
            <p style={{ fontSize: '13px', color: '#e8edf5', fontWeight: 500, marginTop: '2px' }}>
              {String(val ?? '')}
            </p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setStatus('cancelled')}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#8898aa',
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: '7px 18px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            background: '#10b981',
            color: 'white',
            border: 'none',
          }}
        >
          &#10003; Confirmer
        </button>
      </div>
    </div>
  )
}

/* ── EmailCard ── */
function EmailCard({ result }: { result: unknown }) {
  const data = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>
  const to = typeof data.to === 'string' ? data.to : ''
  const subject = typeof data.subject === 'string' ? data.subject : ''
  const body = typeof data.body === 'string' ? data.body : ''

  const href = `/dashboard/email?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <div style={{
      background: '#0f1117',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: '10px',
      padding: '14px',
      marginTop: '6px',
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#3d4f63' }}>
          Destinataire
        </span>
        <p style={{ fontSize: '13px', color: '#e8edf5', marginTop: '2px' }}>{to}</p>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#3d4f63' }}>
          Objet
        </span>
        <p style={{ fontSize: '13px', color: '#e8edf5', marginTop: '2px' }}>{subject}</p>
      </div>
      <a
        href={href}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 18px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          background: 'rgba(99,102,241,0.15)',
          color: '#818cf8',
          textDecoration: 'none',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        Ouvrir dans Email
      </a>
    </div>
  )
}

/* ── ToolRenderer ── */
function ToolRenderer({ items, onConfirm }: { items: ToolDataItem[]; onConfirm?: (action: string, data: Record<string, unknown>) => Promise<boolean> }) {
  return (
    <>
      {items.map((item, i) => {
        switch (item.type) {
          case 'data':
            return <DataCard key={i} result={item.result} />
          case 'confirm':
            return <ConfirmCard key={i} result={item.result} onConfirm={onConfirm} />
          case 'draft_email':
            return <EmailCard key={i} result={item.result} />
          default:
            return null
        }
      })}
    </>
  )
}

/* ── Main Component ── */
export default function AgentMessage({ role, content, toolData, userName, userInitials, onConfirm }: AgentMessageProps) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      {/* Avatar */}
      {isUser ? (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.2)',
          color: '#818cf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {userInitials ?? 'U'}
        </div>
      ) : (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          R
        </div>
      )}

      {/* Content */}
      <div style={{
        maxWidth: '70%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: isUser ? '#818cf8' : '#10b981',
        }}>
          {isUser ? (userName ?? 'Vous') : 'Reem AI'}
        </span>

        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          fontSize: '13px',
          lineHeight: 1.6,
          background: isUser ? 'rgba(255,255,255,0.07)' : '#151a24',
          border: isUser ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.07)',
          color: '#e8edf5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {content}
          {toolData && toolData.length > 0 && (
            <ToolRenderer items={toolData} onConfirm={onConfirm} />
          )}
        </div>
      </div>
    </div>
  )
}
