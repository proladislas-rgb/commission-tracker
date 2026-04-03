'use client'

import { useAuth } from '@/hooks/useAuth'
import InlineEdit from '@/components/ui/InlineEdit'
import type { User } from '@/lib/types'

interface HeaderProps {
  associe: User | null
  primesCount: number
  onRenameAssociate: (name: string) => Promise<void>
  onMobileMenuOpen: () => void
}

export default function Header({ associe, primesCount, onRenameAssociate, onMobileMenuOpen }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="flex items-start justify-between mb-8 animate-fadeIn">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse2" />
          <h1 className="text-xl font-bold text-txt">Commission Tracker</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-txt2">
          <span>Associé :</span>
          {associe ? (
            user?.role === 'admin' ? (
              <InlineEdit
                value={associe.display_name}
                onSave={onRenameAssociate}
                className="font-semibold text-txt"
              />
            ) : (
              <span className="font-semibold text-txt">{associe.display_name}</span>
            )
          ) : (
            <span className="font-semibold text-txt2">—</span>
          )}
          {user?.role === 'admin' && associe && (
            <span className="text-[10px] text-txt3">(cliquer pour renommer)</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {primesCount > 0 && (
          <span className="px-2.5 py-1 bg-indigo/10 border border-indigo/30 rounded-full text-xs text-indigo font-medium">
            {primesCount} prime{primesCount > 1 ? 's' : ''} active{primesCount > 1 ? 's' : ''}
          </span>
        )}
        {/* Burger mobile */}
        <button
          className="lg:hidden p-2 rounded-btn bg-surface border border-border text-txt2 hover:text-txt transition-colors duration-300"
          onClick={onMobileMenuOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>
    </header>
  )
}
