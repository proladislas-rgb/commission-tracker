import { describe, it, expect } from 'vitest'
import { getSuggestions } from '@/lib/reem-suggestions'

describe('getSuggestions', () => {
  it('retourne les suggestions dashboard pour /dashboard', () => {
    const result = getSuggestions('/dashboard')
    expect(result).toContain('💡 Résume-moi ce mois')
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('retourne les suggestions fiche client pour /dashboard/clients/xxx', () => {
    const result = getSuggestions('/dashboard/clients/ecodistrib-id')
    expect(result.some(s => s.includes('Historique'))).toBe(true)
    expect(result.some(s => s.includes('relance'))).toBe(true)
  })

  it('retourne les suggestions Workspace pour /dashboard/workspace', () => {
    const result = getSuggestions('/dashboard/workspace')
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('retourne le fallback pour un pathname inconnu', () => {
    const result = getSuggestions('/some/unknown/path')
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.some(s => s.includes('Résume'))).toBe(true)
  })
})
