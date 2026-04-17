'use client'

import { useState } from 'react'
import { usePresence } from '@/hooks/usePresence'
import CalendrierGrid from '@/components/presence/CalendrierGrid'
import CompteurCards from '@/components/presence/CompteurCards'
import AlerteSeuil from '@/components/presence/AlerteSeuil'
import ErrorAlert from '@/components/ui/ErrorAlert'
import ReconnectGoogleBanner from '@/components/ui/ReconnectGoogleBanner'
import { isOAuthError } from '@/lib/google'

export default function CalendrierPresencePage() {
  const [month, setMonth] = useState(new Date().getMonth())
  const { year, days, loading, error, counters, changeYear, toggleDay, reload } = usePresence()

  const oauthError = isOAuthError(error)

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
          {oauthError ? (
            <ReconnectGoogleBanner redirectTo="/dashboard/calendrier-presence" />
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
