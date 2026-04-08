// lib/drive.ts
// Type partagé pour les fichiers Google Drive — utilisé par DriveExplorer,
// DriveFileRow et WorkspacePage. Évite la duplication d'interface.

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
  parents?: string[]
  iconLink?: string
  thumbnailLink?: string
}
