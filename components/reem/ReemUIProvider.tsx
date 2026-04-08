'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useReemUIPersistence } from '@/hooks/useReemUIPersistence'
import type { ReemUIState } from '@/lib/reem-types'

type StateUpdater = ReemUIState | ((prev: ReemUIState) => ReemUIState)

interface ReemUIContextValue {
  state: ReemUIState
  setState: (next: StateUpdater) => void
}

const ReemUIContext = createContext<ReemUIContextValue | null>(null)

/**
 * Provider qui partage le state Reem UI entre ReemWidget et ReemInsights (et tout autre
 * composant qui a besoin d'ouvrir/fermer le panneau). Monté une seule fois au niveau
 * du layout dashboard pour garantir une instance unique de state + localStorage.
 */
export function ReemUIProvider({ children }: { children: ReactNode }) {
  const value = useReemUIPersistence()
  return <ReemUIContext.Provider value={value}>{children}</ReemUIContext.Provider>
}

/**
 * Hook à utiliser depuis n'importe quel composant sous ReemUIProvider pour accéder
 * au state partagé. Lève une erreur si utilisé hors provider (garde-fou de debug).
 */
export function useReemUI(): ReemUIContextValue {
  const ctx = useContext(ReemUIContext)
  if (!ctx) {
    throw new Error('useReemUI doit être utilisé à l\'intérieur d\'un <ReemUIProvider>')
  }
  return ctx
}
