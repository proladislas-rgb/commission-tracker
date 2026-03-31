'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { Commission, Prime } from '@/lib/types'

interface Props {
  commissions: Commission[]
  primes: Prime[]
}

export default function CaCommissionChart({ commissions, primes }: Props) {
  const data = primes.map(prime => ({
    name:       `${prime.icon} ${prime.name}`,
    ca:         commissions.filter(c => c.prime_id === prime.id).reduce((s, c) => s + Number(c.ca), 0),
    commission: commissions.filter(c => c.prime_id === prime.id).reduce((s, c) => s + Number(c.commission), 0),
    color:      prime.color,
  })).filter(d => d.ca > 0)

  const tickFormatter = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M€` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k€` : `${v}€`

  return (
    <div className="bg-surface border border-[rgba(255,255,255,0.07)] rounded-card p-5 shadow-card">
      <h3 className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-4">
        CA vs Commissions par prime
      </h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-txt3">Aucune donnée</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: '#8898aa', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={tickFormatter} tick={{ fill: '#8898aa', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => formatCurrency(Number(value))}
              labelStyle={{ color: '#e8edf5' }}
            />
            <Legend formatter={(value) => <span style={{ color: '#8898aa', fontSize: 12 }}>{value}</span>} />
            <Bar dataKey="ca" name="CA" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commission" name="Commission" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
