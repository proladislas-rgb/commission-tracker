// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '@/lib/auth'

describe('auth — signToken / verifyToken', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    display_name: 'Test User',
    role: 'admin' as const,
    avatar_color: '#6366f1',
  }

  it('signe un token valide et le vérifie', async () => {
    const token = await signToken(mockUser)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)

    const user = await verifyToken(token)
    expect(user).not.toBeNull()
    expect(user!.id).toBe(mockUser.id)
    expect(user!.username).toBe(mockUser.username)
    expect(user!.role).toBe('admin')
  })

  it('retourne null pour un token invalide', async () => {
    const result = await verifyToken('invalid.token.here')
    expect(result).toBeNull()
  })

  it('retourne null pour un token vide', async () => {
    const result = await verifyToken('')
    expect(result).toBeNull()
  })

  it('retourne null pour un token modifié', async () => {
    const token = await signToken(mockUser)
    const tampered = token.slice(0, -5) + 'XXXXX'
    const result = await verifyToken(tampered)
    expect(result).toBeNull()
  })

  it('préserve le rôle associe', async () => {
    const associe = { ...mockUser, role: 'associe' as const }
    const token = await signToken(associe)
    const user = await verifyToken(token)
    expect(user!.role).toBe('associe')
  })
})
