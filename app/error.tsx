'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="bg-surface rounded-[14px] border border-white/5 p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-rose/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-txt text-lg font-semibold mb-2">Une erreur est survenue</h2>
        <p className="text-txt2 text-sm mb-6">
          {error.message || 'Quelque chose s\u2019est mal passé. Réessayez ou rechargez la page.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo text-white text-sm font-medium rounded-[8px] hover:bg-indigo/90 transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-raised text-txt2 text-sm font-medium rounded-[8px] hover:bg-white/5 transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
