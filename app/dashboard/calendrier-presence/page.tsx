'use client'

import { useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import CalendrierGrid from '@/components/presence/CalendrierGrid'
import CompteurCards from '@/components/presence/CompteurCards'
import AlerteSeuil from '@/components/presence/AlerteSeuil'
import ErrorAlert from '@/components/ui/ErrorAlert'

const OAUTH_ERRORS = new Set(['not_connected', 'invalid_tokens', 'token_expired', 'refresh_failed'])

export default function CalendrierPresencePage() {
  const [month, setMonth] = useState(new Date().getMonth())
  const { year, days, loading, error, counters, changeYear, toggleDay, reload } = usePresence()

  const isOAuthError = error !== null && OAUTH_ERRORS.has(error)

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt">Calendrier de Présence</h1>
        <p className="text-sm text-txt2 mt-1">Suivi fiscal — règle des 183 jours</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4">
          {isOAuthError ? (
            <div className="bg-rose/10 border border-rose/20 rounded-[8px] px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-rose flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-rose text-sm flex-1">
                Connexion Google expirée (mot de passe changé ou accès révoqué). Reconnecte ton compte Google.
              </p>
              <a
                href="/api/auth/google/disconnect"
                className="text-rose text-sm font-medium hover:underline flex-shrink-0"
              >
                Reconnecter Google
              </a>
            </div>
          ) : (
            <ErrorAlert message={error} onRetry={reload} />
          )}
        </div>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="bg-surface border border-border rounded-card p-6 mb-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square bg-raised rounded-[10px] skeleton" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <CalendrierGrid
            year={year}
            month={month}
            days={days}
            onToggle={toggleDay}
            onChangeMonth={setMonth}
            onChangeYear={changeYear}
          />
        </div>
      )}

      {/* Counters */}
      {!loading && (
        <div className="mb-6">
          <CompteurCards
            france={counters.france}
            bahrein={counters.bahrein}
            autres={counters.autres}
            year={year}
          />
        </div>
      )}

      {/* Alert */}
      {!loading && <AlerteSeuil franceDays={counters.france} />}
    </>
  )
}
