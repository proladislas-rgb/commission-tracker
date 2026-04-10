'use client'

import type { PresenceDay, PresenceType } from '@/lib/types'

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const PRESENCE_STYLES: Record<string, { bg: string; border: string; text: string; flag: string }> = {
  france:  { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', text: '#818cf8', flag: '🇫🇷' },
  bahrein: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', flag: '🇧🇭' },
  autres:  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#10b981', flag: '🌍' },
}

interface CalendrierGridProps {
  year: number
  month: number // 0-indexed
  days: PresenceDay[]
  onToggle: (dayIndex: number) => void
  onChangeMonth: (month: number) => void
  onChangeYear: (year: number) => void
}

function parseDateStr(dateStr: string): Date | null {
  // Handle formats: "15/01/2026", "2026-01-15"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr)
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export default function CalendrierGrid({ year, month, days, onToggle, onChangeMonth, onChangeYear }: CalendrierGridProps) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7 // 0=Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build index: date string → { dayIndex, presence }
  const dayMap = new Map<string, { index: number; presence: PresenceType }>()
  days.forEach((d, i) => {
    const parsed = parseDateStr(d.date)
    if (parsed) {
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
      dayMap.set(key, { index: i, presence: d.presence })
    }
  })

  const handlePrevMonth = () => {
    if (month === 0) {
      onChangeYear(year - 1)
      onChangeMonth(11)
    } else {
      onChangeMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      onChangeYear(year + 1)
      onChangeMonth(0)
    } else {
      onChangeMonth(month + 1)
    }
  }

  const cells: React.ReactNode[] = []

  for (let i = 0; i < startDow; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const entry = dayMap.get(dateKey)
    const presence = entry?.presence ?? null
    const style = presence ? PRESENCE_STYLES[presence] : null
    const isToday = dateKey === todayStr

    cells.push(
      <button
        key={d}
        onClick={() => entry != null ? onToggle(entry.index) : undefined}
        className="aspect-square flex flex-col items-center justify-center rounded-[10px] transition-all duration-150 cursor-pointer border"
        style={{
          backgroundColor: style?.bg ?? '#151a24',
          borderColor: isToday ? '#6366f1' : (style?.border ?? 'transparent'),
          color: style?.text ?? '#8898aa',
          boxShadow: isToday ? '0 0 0 2px #6366f1' : undefined,
          gap: '2px',
        }}
        title={presence ? PRESENCE_STYLES[presence].flag : 'Non renseigné'}
      >
        <span className="text-sm font-medium">{d}</span>
        {style && <span className="text-[11px] leading-none">{style.flag}</span>}
      </button>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-card p-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {/* Navigation mois + année */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-btn bg-raised border border-border2 text-txt flex items-center justify-center hover:border-indigo transition-colors cursor-pointer"
          >
            ◀
          </button>
          <span className="text-lg font-semibold text-txt min-w-[160px] text-center">
            {MOIS_LABELS[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-btn bg-raised border border-border2 text-txt flex items-center justify-center hover:border-indigo transition-colors cursor-pointer"
          >
            ▶
          </button>
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-btn p-[3px]">
          {[2025, 2026, 2027, 2028].map(y => (
            <button
              key={y}
              onClick={() => onChangeYear(y)}
              className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: y === year ? '#6366f1' : 'transparent',
                color: y === year ? '#ffffff' : '#8898aa',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-1.5">
        {JOURS_SEMAINE.map(j => (
          <div key={j} className="text-center text-xs font-semibold text-txt3 uppercase tracking-wider py-2">
            {j}
          </div>
        ))}
        {cells}
      </div>

      {/* Légende */}
      <div className="flex gap-5 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo" /> France
        </div>
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber" /> Bahreïn
        </div>
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald" /> Autres
        </div>
        <div className="flex items-center gap-2 text-[13px] text-txt2">
          <div className="w-2.5 h-2.5 rounded-full bg-txt3" /> Non renseigné
        </div>
      </div>

      <p className="text-center text-xs text-txt3 mt-3">
        Cliquer sur un jour pour changer : 🇫🇷 → 🇧🇭 → 🌍 → vide
      </p>
    </div>
  )
}
