'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Couleurs PERSISTÉES en DB (users.avatar_color) — ne pas re-thémer, compat données existantes
const AVATAR_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#38bdf8', label: 'Sky' },
  { value: '#8b5cf6', label: 'Violet' },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [avatarColor, setColor]       = useState('#6366f1')
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6)  { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    setLoading(true)
    try {
      await register({ displayName, username, password, avatarColor })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fadeIn">
        <div className="text-center mb-8">
          <div
            className="lg-gradient lg-shadow-accent inline-flex items-center justify-center mb-4"
            style={{ width: 52, height: 52, borderRadius: 16 }}
          >
            <span className="text-white font-extrabold text-[19px] tracking-[-0.02em]">CT</span>
          </div>
          <h1 className="text-[26px] font-extrabold text-lg-text tracking-[-0.03em]">Créer un compte</h1>
          <p className="text-sm text-lg-muted mt-1.5">Le 1er compte créé sera administrateur</p>
        </div>

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
            label="Nom affiché"
            type="text"
            placeholder="ex : Ladislas"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
          />
          <Input
            label="Identifiant"
            type="text"
            placeholder="ex : ladislas"
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
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          {/* Sélecteur couleur avatar */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium mb-2">
              Couleur de l&apos;avatar
            </p>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all duration-150 cursor-pointer',
                    avatarColor === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-surface scale-110'
                      : 'opacity-60 hover:opacity-100'
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full justify-center mt-1">
            Créer le compte
          </Button>
        </form>

        <p className="text-center text-sm text-lg-muted mt-5">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-lg-info font-semibold hover:underline transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
