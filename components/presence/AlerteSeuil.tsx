'use client'

interface AlerteSeuilProps {
  franceDays: number
}

const SEUIL = 183
const SEUIL_WARNING = 170

export default function AlerteSeuil({ franceDays }: AlerteSeuilProps) {
  if (franceDays < SEUIL_WARNING) return null

  const isDanger = franceDays >= SEUIL

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-card text-sm font-medium"
      style={{
        backgroundColor: isDanger ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isDanger ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)',
        color: isDanger ? '#f43f5e' : '#f59e0b',
      }}
    >
      <span className="text-lg">{isDanger ? '🚨' : '⚠️'}</span>
      <span>
        {isDanger
          ? `Limite dépassée — ${franceDays} jours de présence fiscale en France (seuil : ${SEUIL})`
          : `Attention — vous approchez du seuil de ${SEUIL} jours en France (${franceDays} jours)`}
      </span>
    </div>
  )
}
