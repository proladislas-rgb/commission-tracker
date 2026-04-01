'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import InlineEdit from '@/components/ui/InlineEdit'
import { supabase } from '@/lib/supabase'
import { isOnline, avatarInitials, formatDate, formatRelativeTime } from '@/lib/utils'
import type { User, ActivityLog } from '@/lib/types'

const NAV_ITEMS = [
  { label: 'Dashboard',    color: '#6366f1', href: '/dashboard' },
  { label: 'Facturation',  color: '#38bdf8', href: '/dashboard/invoices' },
]

interface SidebarProps {
  associe: User | null
  onRenameAssociate: (name: string) => Promise<void>
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ associe, onRenameAssociate, mobileOpen, onMobileClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [activityLogs, setActivityLogs] = useState<(ActivityLog & { user?: User })[]>([])
  const loadUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, role, avatar_color, last_seen, created_at')
      setUsers((data ?? []) as User[])
    } catch {
      // silencieux
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data from Supabase
    loadUsers()
    const interval = setInterval(async () => {
      try {
        if (user?.id) {
          await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
          loadUsers()
        }
      } catch {
        // silencieux
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [user?.id, loadUsers])

  // Activité récente
  useEffect(() => {
    async function loadActivity() {
      try {
        const { data } = await supabase
          .from('activity_log')
          .select('*, user:users(id, display_name, avatar_color)')
          .order('created_at', { ascending: false })
          .limit(5)
        setActivityLogs((data ?? []) as (ActivityLog & { user?: User })[])
      } catch {
        // silencieux
      }
    }
    loadActivity()

    const channel = supabase
      .channel('sidebar-activity')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'activity_log' }, async (payload: { new: Record<string, unknown> }) => {
        try {
          const { data: logWithUser } = await supabase
            .from('activity_log')
            .select('*, user:users(id, display_name, avatar_color)')
            .eq('id', (payload.new as { id: string }).id)
            .single()
          if (logWithUser) {
            setActivityLogs(prev => [logWithUser as ActivityLog & { user?: User }, ...prev].slice(0, 5))
          }
        } catch {
          // silencieux
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const navigateTo = (href: string) => {
    router.push(href)
    onMobileClose()
  }

  const sidebarContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex items-center justify-center h-8 border-b border-border text-txt3 hover:text-txt2 transition-colors duration-300 cursor-pointer"
        title={collapsed ? 'Déplier' : 'Replier'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-border" style={{ padding: collapsed ? '20px 8px' : undefined }}>
        <div className="flex items-center gap-2 mb-1" style={{ justifyContent: collapsed ? 'center' : undefined }}>
          <span className="w-2 h-2 rounded-full bg-green animate-pulse2 flex-shrink-0" />
          {!collapsed && (
            <span className="text-[11px] font-semibold text-txt2 uppercase tracking-widest">Commission Tracker</span>
          )}
        </div>
        {!collapsed && associe && (
          <div className="text-xs text-txt3 mt-1">
            Associé :{' '}
            {user?.role === 'admin' ? (
              <InlineEdit
                value={associe.display_name}
                onSave={onRenameAssociate}
                className="text-txt2 font-medium"
              />
            ) : (
              <span className="text-txt2 font-medium">{associe.display_name}</span>
            )}
          </div>
        )}
        {!collapsed && (
          <>
            <div className="text-[11px] text-txt3 mt-1">
              Client : <span className="text-txt2 font-medium">ECODISTRIB</span>
            </div>
            <div className="text-[11px] text-txt3 mt-0.5">
              {formatDate(new Date().toISOString())}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="px-3 py-4 border-b border-border" style={{ padding: collapsed ? '16px 4px' : undefined }}>
        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[1.2px] text-txt3 px-2 mb-2 font-semibold">Navigation</p>
        )}
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => navigateTo(item.href)}
              className="w-full text-left rounded-btn text-sm transition-all duration-150 cursor-pointer flex items-center gap-2"
              style={{
                padding: collapsed ? '6px 0' : '6px 12px',
                justifyContent: collapsed ? 'center' : undefined,
                color: isActive ? '#f0eef8' : undefined,
                backgroundColor: isActive ? '#16142a' : undefined,
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color, boxShadow: isActive ? '0 0 8px rgba(139,92,246,0.4)' : 'none' }} />
              {!collapsed && <span className={isActive ? 'text-txt' : 'text-txt2'}>{item.label}</span>}
            </button>
          )
        })}
      </div>

      {/* Connectés */}
      <div className="py-4 flex-1 overflow-y-auto" style={{ padding: collapsed ? '16px 4px' : '16px 12px' }}>
        {!collapsed && (
          <p className="text-[9px] uppercase tracking-[1.2px] text-txt3 px-2 mb-2 font-semibold">Connectés</p>
        )}
        {users.map(u => (
          <div
            key={u.id}
            className="flex items-center gap-2.5 py-1.5 rounded-btn hover:bg-raised transition-colors"
            style={{
              padding: collapsed ? '6px 0' : '6px 8px',
              justifyContent: collapsed ? 'center' : undefined,
            }}
            title={collapsed ? u.display_name : undefined}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: u.avatar_color, border: '1px solid rgba(139,92,246,0.2)' }}
            >
              {avatarInitials(u.display_name)}
            </div>
            {!collapsed && (
              <>
                <span className="text-xs text-txt2 truncate flex-1">{u.display_name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline(u.last_seen) ? 'bg-green' : 'bg-txt3'}`}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Activité récente */}
      {!collapsed && (
        <div id="activite" className="px-3 py-4 border-t border-border" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <p className="text-[9px] uppercase tracking-[1.2px] text-txt3 px-2 mb-2 font-semibold">Activité récente</p>
          {activityLogs.length === 0 ? (
            <p className="text-[10px] text-txt3 px-2">Aucune activité</p>
          ) : (
            activityLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 rounded-btn hover:bg-raised transition-colors">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: log.user?.avatar_color ?? '#6366f1' }}
                >
                  {log.user ? avatarInitials(log.user.display_name) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-txt2 truncate">{log.details?.description}</p>
                  <p className="text-[9px] text-txt3">{formatRelativeTime(log.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer */}
      {user && (
        <div className="py-4 border-t border-border" style={{ padding: collapsed ? '16px 4px' : '16px 12px' }}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 mb-3 px-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: user.avatar_color }}
              >
                {avatarInitials(user.display_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-txt truncate">{user.display_name}</p>
                <p className="text-[10px] text-txt3 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: user.avatar_color }}
                title={user.display_name}
              >
                {avatarInitials(user.display_name)}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full text-left rounded-btn text-xs text-txt2 hover:text-rose hover:bg-rose/10 transition-all duration-150 cursor-pointer"
            style={{
              padding: collapsed ? '6px 0' : '6px 12px',
              textAlign: collapsed ? 'center' : 'left',
            }}
            title={collapsed ? 'Se déconnecter' : undefined}
          >
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            ) : (
              'Se déconnecter'
            )}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden lg:flex fixed right-0 top-0 h-screen border-l border-border flex-col z-30"
        style={{
          width: collapsed ? '60px' : '220px',
          transition: 'width 0.3s ease',
          backgroundColor: '#08071a',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onMobileClose} />
          <aside className="absolute right-0 top-0 h-full border-l border-border" style={{ width: '220px', backgroundColor: '#08071a' }}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
