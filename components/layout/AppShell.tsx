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

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar
        associe={associe}
        onRenameAssociate={onRenameAssociate}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className="lg:mr-sidebar min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
