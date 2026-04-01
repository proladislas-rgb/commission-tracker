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
      className="border rounded-[20px] p-5 shadow-card
        hover:-translate-y-0.5 transition-all duration-300 cursor-default will-change-transform overflow-hidden relative"
      style={{
        backgroundColor: '#0e0d1a',
        borderColor: 'rgba(139,92,246,0.12)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(139,92,246,0.15)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.12)'; e.currentTarget.style.boxShadow = '' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, #8b5cf6)` }} />
      <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-2">{label}</p>
      <p className="text-[28px] font-bold text-txt leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
      {subtext && <div className="mt-1.5">{subtext}</div>}
    </div>
  )
}
