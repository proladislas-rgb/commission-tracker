'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import InlineEdit from '@/components/ui/InlineEdit'
import { supabase } from '@/lib/supabase'
import { isOnline, avatarInitials, formatDate } from '@/lib/utils'
import type { User } from '@/lib/types'

const NAV_ITEMS = [
  { id: 'kpis',        label: 'KPIs' },
  { id: 'graphiques',  label: 'Graphiques' },
  { id: 'paiements',   label: 'Paiements' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'activite',    label: 'Activité' },
]

interface SidebarProps {
  associe: User | null
  onRenameAssociate: (name: string) => Promise<void>
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ associe, onRenameAssociate, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState<User[]>([])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, role, avatar_color, last_seen, created_at')
    setUsers((data ?? []) as User[])
  }, [])

  useEffect(() => {
    loadUsers()
    // Mettre à jour last_seen toutes les 60s
    const interval = setInterval(async () => {
      if (user?.id) {
        await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
        loadUsers()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [user?.id, loadUsers])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    onMobileClose()
  }

  const sidebarContent = (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse2" />
          <span className="text-[11px] font-semibold text-txt2 uppercase tracking-widest">Commission Tracker</span>
        </div>
        {associe && (
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
        <div className="text-[11px] text-txt3 mt-1">
          Client : <span className="text-txt2 font-medium">ECODISTRIB</span>
        </div>
        <div className="text-[11px] text-txt3 mt-0.5">
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3 py-4 border-b border-[rgba(255,255,255,0.07)]">
        <p className="text-[9px] uppercase tracking-[1.2px] text-txt3 px-2 mb-2 font-semibold">Navigation</p>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className="w-full text-left px-3 py-1.5 rounded-btn text-sm text-txt2 hover:text-txt hover:bg-raised transition-all duration-150 cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Connectés */}
      <div className="px-3 py-4 flex-1 overflow-y-auto">
        <p className="text-[9px] uppercase tracking-[1.2px] text-txt3 px-2 mb-2 font-semibold">Connectés</p>
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-btn hover:bg-raised transition-colors">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: u.avatar_color }}
            >
              {avatarInitials(u.display_name)}
            </div>
            <span className="text-xs text-txt2 truncate flex-1">{u.display_name}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline(u.last_seen) ? 'bg-green' : 'bg-txt3'}`}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      {user && (
        <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.07)]">
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
          <button
            onClick={logout}
            className="w-full text-left px-3 py-1.5 rounded-btn text-xs text-txt2 hover:text-rose hover:bg-rose/10 transition-all duration-150 cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-sidebar bg-surface border-l border-[rgba(255,255,255,0.07)] flex-col z-30">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onMobileClose} />
          <aside className="absolute right-0 top-0 h-full w-sidebar bg-surface border-l border-[rgba(255,255,255,0.07)]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
