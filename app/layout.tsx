import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { BunnyProvider } from './context/BunnyContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bunny Tamagotchi',
  description: 'A cute virtual bunny companion',
  manifest: '/manifest.json',
  themeColor: '#FFE5F1',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bunny Tamagotchi'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#FFE5F1" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <BunnyProvider>
            <div className="min-h-screen bg-gradient-to-br from-bunny-pink to-bunny-purple">
              {children}
            </div>
          </BunnyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}