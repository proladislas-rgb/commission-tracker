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
        backgroundColor: '#0e0d1a',
        borderRight: '0.5px solid rgba(99,102,241,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid rgba(99,102,241,0.08)' }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', fontWeight: 500, color: '#f0eef8' }}>
          Chat
        </span>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        {/* Direct */}
        <p style={{ padding: '10px 14px 4px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4a4466' }}>
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
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: isActive ? '#a78bfa' : '#8b85a8',
                backgroundColor: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.07)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? 'rgba(139,92,246,0.15)' : 'transparent' }}
            >
              <span style={{ fontSize: '13px', color: '#4a4466', flexShrink: 0 }}>#</span>
              <span className="truncate flex-1">{ch.name}</span>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#a78bfa', flexShrink: 0 }} />
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
            <p style={{ padding: '10px 14px 4px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4a4466' }}>
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
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    color: isActive ? '#a78bfa' : '#8b85a8',
                    backgroundColor: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.07)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? 'rgba(139,92,246,0.15)' : 'transparent' }}
                >
                  <span style={{ fontSize: '13px', color: '#4a4466', flexShrink: 0 }}>#</span>
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
        <div style={{ marginTop: 'auto', padding: '10px', borderTop: '0.5px solid rgba(99,102,241,0.1)', backgroundColor: '#0e0d1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              backgroundColor: user.role === 'admin' ? 'rgba(139,92,246,0.25)' : 'rgba(56,189,248,0.25)',
              color: user.role === 'admin' ? '#a78bfa' : '#38bdf8',
            }}
          >
            {initials(user.display_name)}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: '11px', color: '#f0eef8', fontFamily: 'DM Sans, sans-serif' }} className="truncate">{user.display_name}</p>
            <p style={{ fontSize: '9px', color: '#10b981' }}>en ligne</p>
          </div>
        </div>
      )}
    </div>
  )
}
