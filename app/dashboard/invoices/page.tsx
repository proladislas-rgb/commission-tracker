'use client'

import InvoiceChat from '@/components/invoice/InvoiceChat'

export default function InvoicesPage() {
  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Facturation</h1>
        <p className="text-sm text-txt2 mt-1">Générer et suivre vos factures</p>
      </div>

      {/* Tchat agent */}
      <InvoiceChat />
    </>
  )
}
