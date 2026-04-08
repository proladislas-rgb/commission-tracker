'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useClientContext } from '@/hooks/useClientContext'
import type { ReemContext } from '@/lib/reem-types'

function derivePageLabel(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/dashboard/clients') return 'Clients'
  if (pathname.startsWith('/dashboard/clients/')) return 'Fiche client'
  if (pathname.startsWith('/dashboard/invoices')) return 'Facturation'
  if (pathname === '/dashboard/workspace') return 'Workspace'
  if (pathname === '/dashboard/chat') return 'Chat interne'
  return 'Dashboard'
}

export function useReemContext(): ReemContext {
  const pathname = usePathname() ?? '/dashboard'
  const { selectedClientId } = useClientContext()

  return useMemo<ReemContext>(() => ({
    pathname,
    pageLabel: derivePageLabel(pathname),
    activeClientId: selectedClientId,
  }), [pathname, selectedClientId])
}
