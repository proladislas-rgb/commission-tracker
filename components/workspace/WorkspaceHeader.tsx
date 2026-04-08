'use client'

interface WorkspaceHeaderProps {
  hasDraft: boolean
  attachmentCount: number
  drawerOpen: boolean
  onOpenDrawer: () => void
}

export default function WorkspaceHeader({ hasDraft, attachmentCount, drawerOpen, onOpenDrawer }: WorkspaceHeaderProps) {
  // Quand le drawer est ouvert, on masque le bouton (le drawer est déjà visible)
  if (drawerOpen) {
    return (
      <div className="px-6 md:px-10 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-txt mb-1">Workspace</h1>
        <p className="text-sm text-txt2">
          Vos fichiers Google Drive et la composition d&apos;emails au même endroit
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-10 pt-6 pb-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-txt mb-1">Workspace</h1>
        <p className="text-sm text-txt2">
          Vos fichiers Google Drive et la composition d&apos;emails au même endroit
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-all duration-200 flex-shrink-0"
        style={
          hasDraft
            ? {
                backgroundColor: 'rgba(99,102,241,0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: 'none',
              }
            : {
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }
        }
        onMouseEnter={e => {
          if (hasDraft) {
            e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)'
          } else {
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.45)'
          }
        }}
        onMouseLeave={e => {
          if (hasDraft) {
            e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.15)'
          } else {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'
          }
        }}
      >
        {hasDraft ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
            Brouillon en cours
            {attachmentCount > 0 && (
              <span
                style={{
                  backgroundColor: 'rgba(245,158,11,0.18)',
                  color: '#f59e0b',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {attachmentCount} PJ
              </span>
            )}
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Nouveau mail
          </>
        )}
      </button>
    </div>
  )
}
