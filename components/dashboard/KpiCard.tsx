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
    <div className="glass lg-ease lg-hover-lift p-4 cursor-default overflow-hidden relative">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
        <p className="text-[11px] text-lg-muted font-semibold">{label}</p>
      </div>
      <p className="text-[21px] font-extrabold text-lg-text tracking-[-0.02em] leading-tight">{value}</p>
      {subtext && <div className="mt-1.5">{subtext}</div>}
    </div>
  )
}
