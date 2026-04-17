'use client'

import { useCallback, useState } from 'react'

interface ReconnectGoogleBannerProps {
  message?: string
  redirectTo?: string
}

/**
 * Bandeau affiché quand les tokens Google sont invalides (changement de mdp,
 * scope mis à jour, révocation côté Google). Fait un POST vers
 * /api/auth/google/disconnect puis redirige vers le consent OAuth.
 *
 * POST (plutôt que <a href>) pour éviter qu'une image/link externe puisse
 * déclencher la déconnexion par CSRF.
 */
export default function ReconnectGoogleBanner({
  message = 'Connexion Google expirée (mot de passe changé ou accès révoqué). Reconnecte ton compte Google.',
  redirectTo = '/dashboard/workspace',
}: ReconnectGoogleBannerProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect: redirectTo }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`
      }
    } catch {
      window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`
    }
  }, [redirectTo])

  return (
    <div className="bg-rose/10 border border-rose/20 rounded-[8px] px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-rose flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="text-rose text-sm flex-1">{message}</p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-rose text-sm font-medium hover:underline flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Redirection...' : 'Reconnecter Google'}
      </button>
    </div>
  )
}
