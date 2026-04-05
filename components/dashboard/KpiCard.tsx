'use client'

import { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string
  accent: string
  subtext?: ReactNode
}

export default function KpiCard({ label, value, accent, subtext }: KpiCardProps) {
  return (
    <div
      className="border rounded-[20px] p-5 shadow-card glow-hover
        hover:-translate-y-0.5 transition-all duration-300 cursor-default will-change-transform overflow-hidden relative"
      style={{
        backgroundColor: '#0f1117',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl" style={{ background: `${accent}15` }} />
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
      <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-2">{label}</p>
      <p className="text-[28px] font-bold text-txt leading-tight" style={{ fontFamily: 'var(--font-sora), sans-serif' }}>{value}</p>
      {subtext && <div className="mt-1.5">{subtext}</div>}
    </div>
  )
}
