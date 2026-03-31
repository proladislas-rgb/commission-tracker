'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { Commission, Prime } from '@/lib/types'

interface Props {
  commissions: Commission[]
  primes: Prime[]
}

export default function RepartitionChart({ commissions, primes }: Props) {
  const data = primes.map(prime => ({
    name:  prime.name,
    value: commissions.filter(c => c.prime_id === prime.id).reduce((s, c) => s + Number(c.ca), 0),
    color: prime.color,
    icon:  prime.icon,
  })).filter(d => d.value > 0)

  return (
    <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-5 shadow-card">
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
              contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: '#e8edf5' }}
            />
            <Legend
              formatter={(value) => <span style={{ color: '#8898aa', fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
