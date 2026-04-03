'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { CHART_TOOLTIP_STYLE } from '@/lib/constants'
import type { Commission, Prime } from '@/lib/types'

interface Props {
  commissions: Commission[]
  primes: Prime[]
}

export default function CaCommissionChart({ commissions, primes }: Props) {
  const data = useMemo(() => primes.map(prime => {
    const matched = commissions.filter(c => String(c.prime_id) === String(prime.id))
    return {
      name:       `${prime.icon} ${prime.name}`,
      ca:         matched.reduce((s, c) => s + (Number(c.ca) || 0), 0),
      commission: matched.reduce((s, c) => s + (Number(c.commission) || 0), 0),
      color:      prime.color,
    }
  }).filter(d => d.ca > 0), [commissions, primes])

  const tickFormatter = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M€` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k€` : `${v}€`

  return (
    <div className="rounded-card p-5 shadow-card min-h-[300px] transition-shadow duration-300" style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-4">
        CA vs Commissions par prime
      </h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-txt3">Aucune donnée</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <defs>
              <linearGradient id="barGradientCA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
              </linearGradient>
              <linearGradient id="barGradientComm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#8898aa', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={tickFormatter} tick={{ fill: '#8898aa', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: '#e8edf5' }}
              itemStyle={{ color: '#8898aa' }}
            />
            <Legend formatter={(value) => <span style={{ color: '#8898aa', fontSize: 12 }}>{value}</span>} />
            <Bar dataKey="ca" name="CA" fill="url(#barGradientCA)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commission" name="Commission" fill="url(#barGradientComm)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
