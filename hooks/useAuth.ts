'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react'
import type { AuthUser, LoginPayload, RegisterPayload } from '@/lib/types'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) setUser(await res.json())
      else setUser(null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erreur de connexion')
    setUser(data)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'inscription")
    setUser(data)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/me', { method: 'DELETE' })
    setUser(null)
  }, [])

  return createElement(AuthContext.Provider, { value: { user, isLoading, login, register, logout } }, children)
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
