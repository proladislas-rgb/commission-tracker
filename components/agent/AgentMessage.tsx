'use client'

import { useMemo } from 'react'

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

/* ── EmailCard ── */
function EmailCard({ result }: { result: unknown }) {
  const data = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>
  const to = typeof data.to === 'string' ? data.to : ''
  const subject = typeof data.subject === 'string' ? data.subject : ''
  const body = typeof data.body === 'string' ? data.body : ''

  const href = `/dashboard/workspace?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

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
function ToolRenderer({ items }: { items: ToolDataItem[] }) {
  return (
    <>
      {items.map((item, i) => {
        if (item.type === 'navigation') {
          const data = item.result as { pathname: string; label: string }
          return (
            <a
              href={data.pathname}
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '8px',
                color: '#818cf8',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 500,
                marginTop: '6px',
              }}
            >
              → {data.label}
            </a>
          )
        }
        switch (item.type) {
          case 'data':
            return <DataCard key={i} result={item.result} />
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
export default function AgentMessage({ role, content, toolData, userName, userInitials }: AgentMessageProps) {
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
            <ToolRenderer items={toolData} />
          )}
        </div>
      </div>
    </div>
  )
}
