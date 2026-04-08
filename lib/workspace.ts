// lib/workspace.ts

export interface DriveAttachment {
  type: 'drive'
  fileId: string
  fileName: string
  mimeType: string
  size?: number
}

export interface LocalAttachment {
  type: 'local'
  data: string            // base64 — NON persisté en localStorage
  fileName: string
  mimeType: string
  size?: number
}

/** Union discriminée par `type` — élimine le besoin de non-null assertions. */
export type Attachment = DriveAttachment | LocalAttachment

export interface Draft {
  to: string
  subject: string
  body: string
  attachments: Attachment[]
}

export const EMPTY_DRAFT: Draft = {
  to: '',
  subject: '',
  body: '',
  attachments: [],
}

/**
 * True dès qu'au moins un champ texte est non vide ou qu'il y a des PJ.
 * Sert à savoir si le brouillon doit être persisté / si le bouton header
 * doit afficher "Brouillon en cours" plutôt que "Nouveau mail".
 */
export function hasContent(draft: Draft): boolean {
  return (
    draft.to.trim().length > 0 ||
    draft.subject.trim().length > 0 ||
    draft.body.trim().length > 0 ||
    draft.attachments.length > 0
  )
}

/**
 * Filtre une copie du draft pour la sérialisation localStorage :
 * exclut les pièces jointes locales (base64 trop lourd, risque quota).
 * Les références Drive (fileId + métadonnées légères) sont conservées.
 */
export function toSerializableDraft(draft: Draft): Draft {
  return {
    ...draft,
    attachments: draft.attachments.filter(a => a.type === 'drive'),
  }
}
