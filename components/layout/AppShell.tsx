'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import type { User } from '@/lib/types'

interface AppShellProps {
  children: ReactNode
  associe: User | null
  onRenameAssociate: (name: string) => Promise<void>
}

// Pages qui veulent occuper toute la largeur disponible sans le wrapper
// max-w-5xl (chat avec colonnes, workspace avec tiroir plein écran).
const FULL_WIDTH_PATHS = new Set(['/dashboard/chat', '/dashboard/workspace'])

export default function AppShell({ children, associe, onRenameAssociate }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)
  const pathname = usePathname() ?? ''
  const isFullWidth = FULL_WIDTH_PATHS.has(pathname)

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        associe={associe}
        onRenameAssociate={onRenameAssociate}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <main className="min-h-screen">
        <style>{`
          @media (min-width: 1024px) {
            main { margin-right: ${collapsed ? '60px' : '220px'}; transition: margin-right 0.3s ease; }
          }
        `}</style>
        {isFullWidth ? (
          children
        ) : (
          <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
        )}
      </main>
    </div>
  )
}
