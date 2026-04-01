'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { CHART_TOOLTIP_STYLE } from '@/lib/constants'
import type { Commission, Prime } from '@/lib/types'

interface Props {
  commissions: Commission[]
  primes: Prime[]
}

export default function RepartitionChart({ commissions, primes }: Props) {
  const data = useMemo(() => primes.map(prime => {
    const matched = commissions.filter(c => String(c.prime_id) === String(prime.id))
    const value = matched.reduce((s, c) => s + (Number(c.ca) || 0), 0)
    return {
      name:  prime.name,
      value,
      color: prime.color,
      icon:  prime.icon,
    }
  }).filter(d => d.value > 0), [commissions, primes])

  return (
    <div className="rounded-card p-5 shadow-card min-h-[300px] transition-shadow duration-300" style={{ backgroundColor: '#0e0d1a', border: '1px solid rgba(139,92,246,0.12)' }}>
      <h3 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Répartition CA par prime
      </h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-txt3">Aucune donnée</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: '#f0eef8' }}
              itemStyle={{ color: '#8b85a8' }}
            />
            <Legend
              formatter={(value) => <span style={{ color: '#8b85a8', fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
