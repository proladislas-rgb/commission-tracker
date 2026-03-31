'use client'

import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'
import type { User } from '@/lib/types'

interface AppShellProps {
  children: ReactNode
  associe: User | null
  onRenameAssociate: (name: string) => Promise<void>
}

export default function AppShell({ children, associe, onRenameAssociate }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)

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
        <div className="max-w-5xl mx-auto px-4 py-8">
          <style>{`
            @media (min-width: 1024px) {
              main { margin-right: ${collapsed ? '60px' : '220px'}; transition: margin-right 0.3s ease; }
            }
          `}</style>
          {children}
        </div>
      </main>
    </div>
  )
}
