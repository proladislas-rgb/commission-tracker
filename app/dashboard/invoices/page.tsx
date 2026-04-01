'use client'

export default function InvoicesPage() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-txt">Facturation</h1>
        <p className="text-sm text-txt2 mt-1">Générer et suivre vos factures</p>
      </div>

      {/* Placeholder — conteneur futur tchat agent */}
      <div
        className="rounded-[14px] border border-[rgba(255,255,255,0.07)] flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: '#0f1117', minHeight: '400px' }}
      >
        {/* Icône document */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8898aa"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p className="text-sm text-txt2">L&apos;assistant facturation sera disponible ici</p>
      </div>
    </>
  )
}
