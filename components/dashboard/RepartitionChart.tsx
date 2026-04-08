'use client'

import { useMemo, type ReactNode } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { formatCurrency } from '@/lib/utils'
import { CHART_TOOLTIP_STYLE } from '@/lib/constants'
import type { Commission, Prime } from '@/lib/types'

interface Props {
  commissions: Commission[]
  primes: Prime[]
}

function tooltipFormatter(value: ValueType | undefined): string {
  return formatCurrency(Number(value) || 0)
}

function legendFormatter(value: string): ReactNode {
  return <span style={{ color: '#8898aa', fontSize: 12 }}>{value}</span>
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
    <div className="rounded-card p-5 shadow-card min-h-[300px] transition-shadow duration-300" style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-4">
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
              formatter={tooltipFormatter}
              labelStyle={{ color: '#e8edf5' }}
              itemStyle={{ color: '#8898aa' }}
            />
            <Legend formatter={legendFormatter} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
