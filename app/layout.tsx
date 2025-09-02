import type { Metadata } from 'next'
import { Inter, Press_Start_2P } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './context/AuthContext'
import { BunnyProvider } from './context/BunnyContext'
import { NotificationProvider } from './context/NotificationContext'

const inter = Inter({ subsets: ['latin'] })
const pressStart2P = Press_Start_2P({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p'
})

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
              
              // PWA debug info
              window.addEventListener('beforeinstallprompt', (e) => {
                console.log('PWA install prompt available!');
                e.userChoice.then((choiceResult) => {
                  console.log(choiceResult.outcome);
                });
              });

              // Set CSS custom properties for viewport height
              function setViewportHeight() {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', vh + 'px');
              }
              setViewportHeight();
              window.addEventListener('resize', setViewportHeight);
            `,
          }}
        />
      </head>
      <body className={`${inter.className} ${pressStart2P.variable}`}>
        <AuthProvider>
          <BunnyProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-gradient-to-br from-bunny-pink to-bunny-purple">
                {children}
              </div>
            </NotificationProvider>
          </BunnyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}