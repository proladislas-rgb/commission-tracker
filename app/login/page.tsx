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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse2" />
            <span className="text-sm font-semibold text-txt2 tracking-wide uppercase">Commission Tracker</span>
          </div>
          <h1 className="text-2xl font-bold text-txt">Connexion</h1>
          <p className="text-sm text-txt2 mt-1">Accédez à votre espace</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-card p-6 shadow-card flex flex-col gap-4"
          style={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {error && (
            <div className="bg-rose/10 border border-rose/30 rounded-btn px-3 py-2 text-sm text-rose">
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

        <p className="text-center text-sm text-txt2 mt-4">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-indigo hover:text-indigo2 transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
