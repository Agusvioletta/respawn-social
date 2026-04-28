import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Respawn Social',
    template: '%s | Respawn Social',
  },
  description: 'El lugar donde siempre volvés. Red social para gamers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Respawn',
  },
  openGraph: {
    type: 'website',
    siteName: 'Respawn Social',
    title: 'Respawn Social — El lugar donde siempre volvés',
    description: 'La red social definitiva para gamers en español. Feed, torneos, arcade integrado, clips y más.',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary',
    title: 'Respawn Social',
    description: 'La red social definitiva para gamers en español.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#00FFF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
