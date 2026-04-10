'use client'

interface CompteurCardsProps {
  france: number
  bahrein: number
  autres: number
  year: number
}

const SEUIL = 183
const SEUIL_WARNING = 170

export default function CompteurCards({ france, bahrein, autres, year }: CompteurCardsProps) {
  const pct = Math.min((france / SEUIL) * 100, 100)
  const remaining = Math.max(SEUIL - france, 0)

  let barColor = '#10b981' // emerald = safe
  if (france >= SEUIL) barColor = '#f43f5e' // rose = danger
  else if (france >= SEUIL_WARNING) barColor = '#f59e0b' // amber = warning

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* France */}
      <div className="bg-surface border border-border rounded-card p-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-txt2 font-medium">France</span>
          <span className="text-xl">🇫🇷</span>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold" style={{ color: '#818cf8' }}>{france}</span>
          <span className="text-base font-normal text-txt3"> / {SEUIL}</span>
        </div>
        <div className="h-1.5 bg-raised rounded-full mt-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="text-xs text-txt3 mt-2">
          {france >= SEUIL
            ? 'Limite dépassée'
            : `${remaining} jour${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} avant le seuil`}
        </p>
      </div>

      {/* Bahreïn */}
      <div className="bg-surface border border-border rounded-card p-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-txt2 font-medium">Bahreïn</span>
          <span className="text-xl">🇧🇭</span>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{bahrein}</span>
        </div>
        <p className="text-xs text-txt3 mt-2">jours en {year}</p>
      </div>

      {/* Autres */}
      <div className="bg-surface border border-border rounded-card p-5" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-txt2 font-medium">Autres</span>
          <span className="text-xl">🌍</span>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold" style={{ color: '#10b981' }}>{autres}</span>
        </div>
        <p className="text-xs text-txt3 mt-2">jours en {year}</p>
      </div>
    </div>
  )
}
