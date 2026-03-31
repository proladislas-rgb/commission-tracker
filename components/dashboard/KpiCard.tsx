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
      className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-5 shadow-card
        hover:bg-raised hover:-translate-y-0.5 hover:shadow-raised transition-all duration-200 cursor-default"
      style={{ borderTop: `2px solid ${accent}` }}
    >
      <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-2">{label}</p>
      <p className="text-[26px] font-extrabold text-txt leading-tight">{value}</p>
      {subtext && <div className="mt-1.5">{subtext}</div>}
    </div>
  )
}
