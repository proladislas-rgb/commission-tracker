import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Commission Tracker',
  description: 'Suivi des commissions associé commercial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-bg text-txt font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
