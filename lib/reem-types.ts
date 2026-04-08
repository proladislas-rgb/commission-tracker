// lib/reem-types.ts

export type ReemVisibility = 'bubble' | 'panel-open' | 'hidden'

export interface ReemUIState {
  visibility: ReemVisibility
  draftMessage: string
}

export const EMPTY_REEM_UI: ReemUIState = {
  visibility: 'bubble',
  draftMessage: '',
}

export interface ReemEntityRef {
  type: 'client' | 'commission' | 'paiement' | 'invoice' | 'email_draft'
  id?: string
  preview?: string
}

export interface ReemContext {
  pathname: string
  pageLabel: string
  activeClientId: string | null
  selectedEntity?: ReemEntityRef
}

export interface Insight {
  id: string
  severity: 'info' | 'warning' | 'alert'
  icon: string            // emoji
  title: string           // max 8 mots
  description: string     // 1 phrase avec chiffres
  actionLabel: string
  actionPrompt: string    // prompt envoyé à Reem si clic
}
