'use client'

import type { Channel } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface ChatSidebarProps {
  channels: Channel[]
  activeChannelId: string | null
  onSelect: (channelId: string) => void
  unreadCounts: Record<string, number>
}

export default function ChatSidebar({ channels, activeChannelId, onSelect, unreadCounts }: ChatSidebarProps) {
  const { user } = useAuth()

  const generalChannels = channels.filter(c => c.type === 'general')
  const clientChannels = channels.filter(c => c.type === 'client')

  return (
    <div
      className="h-full flex flex-col flex-shrink-0"
      style={{
        width: '190px',
        backgroundColor: '#0f1117',
        borderRight: '0.5px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#e8edf5' }}>
          Chat
        </span>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        {/* Direct */}
        <p style={{ padding: '10px 14px 4px', fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4f63' }}>
          Direct
        </p>
        {generalChannels.map(ch => {
          const isActive = ch.id === activeChannelId
          const unread = Number(unreadCounts[ch.id]) || 0
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className="w-full text-left cursor-pointer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 10px',
                margin: '1px 6px',
                borderRadius: '6px',

                fontSize: '12px',
                color: isActive ? '#818cf8' : '#8898aa',
                backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            >
              <span style={{ fontSize: '13px', color: '#3d4f63', flexShrink: 0 }}>#</span>
              <span className="truncate flex-1">{ch.name}</span>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#818cf8', flexShrink: 0 }} />
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', marginLeft: 'auto', flexShrink: 0 }} />
              {unread > 0 && (
                <span style={{ backgroundColor: '#f43f5e', color: '#ffffff', fontSize: '8px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: 'auto' }}>
                  {unread}
                </span>
              )}
            </button>
          )
        })}

        {/* Clients */}
        {clientChannels.length > 0 && (
          <>
            <p style={{ padding: '10px 14px 4px', fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4f63' }}>
              Clients
            </p>
            {clientChannels.map(ch => {
              const isActive = ch.id === activeChannelId
              const unread = Number(unreadCounts[ch.id]) || 0
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelect(ch.id)}
                  className="w-full text-left cursor-pointer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 10px',
                    margin: '1px 6px',
                    borderRadius: '6px',
    
                    fontSize: '12px',
                    color: isActive ? '#818cf8' : '#8898aa',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  <span style={{ fontSize: '13px', color: '#3d4f63', flexShrink: 0 }}>#</span>
                  <span className="truncate flex-1">{ch.name}</span>
                  {unread > 0 && (
                    <span style={{ backgroundColor: '#f43f5e', color: '#ffffff', fontSize: '8px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', marginLeft: 'auto' }}>
                      {unread}
                    </span>
                  )}
                </button>
              )
            })}
          </>
        )}
      </div>

      {/* Footer */}
      {user && (
        <div style={{ marginTop: 'auto', padding: '10px', borderTop: '0.5px solid rgba(255,255,255,0.07)', backgroundColor: '#0f1117', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 500,
              flexShrink: 0,
              backgroundColor: user.role === 'admin' ? 'rgba(255,255,255,0.15)' : 'rgba(56,189,248,0.25)',
              color: user.role === 'admin' ? '#818cf8' : '#38bdf8',
            }}
          >
            {initials(user.display_name)}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: '11px', color: '#e8edf5' }} className="truncate">{user.display_name}</p>
            <p style={{ fontSize: '9px', color: '#10b981' }}>en ligne</p>
          </div>
        </div>
      )}
    </div>
  )
}
