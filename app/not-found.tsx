import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="bg-surface rounded-[14px] border border-white/5 p-8 max-w-md w-full text-center">
        <div className="text-6xl font-bold text-indigo mb-2">404</div>
        <h2 className="text-txt text-lg font-semibold mb-2">Page introuvable</h2>
        <p className="text-txt2 text-sm mb-6">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-indigo text-white text-sm font-medium rounded-[8px] hover:bg-indigo/90 transition-colors"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  )
}
