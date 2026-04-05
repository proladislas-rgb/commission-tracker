'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="bg-surface rounded-[14px] border border-white/5 p-8 max-w-lg w-full text-center">
        <div className="w-12 h-12 rounded-full bg-rose/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-txt text-lg font-semibold mb-2">Erreur du dashboard</h2>
        <p className="text-txt2 text-sm mb-1">
          {error.message || 'Impossible de charger cette section.'}
        </p>
        <p className="text-txt3 text-xs mb-6">
          Si le problème persiste, essayez de vous reconnecter.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo text-white text-sm font-medium rounded-[8px] hover:bg-indigo/90 transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-raised text-txt2 text-sm font-medium rounded-[8px] hover:bg-white/5 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    </div>
  )
}
