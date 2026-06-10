'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ username, password })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="lg-gradient lg-shadow-accent inline-flex items-center justify-center mb-4"
            style={{ width: 52, height: 52, borderRadius: 16 }}
          >
            <span className="text-white font-extrabold text-[19px] tracking-[-0.02em]">CT</span>
          </div>
          <h1 className="text-[26px] font-extrabold text-lg-text tracking-[-0.03em]">Commission Tracker</h1>
          <p className="text-sm text-lg-muted mt-1.5">Connecte-toi à ton espace</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="glass-strong p-6 flex flex-col gap-4"
        >
          {error && (
            <div className="bg-[rgba(255,99,105,0.13)] border border-[rgba(255,99,105,0.22)] rounded-[12px] px-3 py-2 text-sm text-lg-danger">
              {error}
            </div>
          )}
          <Input
            label="Identifiant"
            type="text"
            placeholder="votre identifiant"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" loading={loading} className="w-full justify-center mt-1">
            Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-lg-muted mt-5">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-lg-info font-semibold hover:underline transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
