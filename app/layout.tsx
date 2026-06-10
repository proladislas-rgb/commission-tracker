import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import GlassBackdrop from '@/components/layout/GlassBackdrop'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Commission Tracker',
  description: 'Suivi des commissions associé commercial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${sora.variable}`}>
      <body className="bg-bg text-lg-text antialiased" style={{ fontFamily: "-apple-system, 'SF Pro Display', var(--font-inter), BlinkMacSystemFont, sans-serif" }}>
        <GlassBackdrop />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>
        </div>
      </body>
    </html>
  )
}
