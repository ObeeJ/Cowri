import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { IBM_Plex_Sans, Google_Sans } from 'next/font/google'
import '~/styles.css'

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const googleSans = Google_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Cowri',
  description: 'Cowri is a social finance app for joint savings circles and splitting payments.',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('cowri.theme')
    var dark =
      stored === 'dark' ||
      ((stored === 'system' || stored === null) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) {
      document.documentElement.classList.add('dark')
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#06140a')
    }
  } catch (error) {}
})()
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlex.variable} ${googleSans.variable}`}>
      <head>
        <meta name="theme-color" content="#f4f1ea" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <noscript>
          Cowri needs JavaScript to show your balance and move money. Please enable it and reload.
        </noscript>
      </body>
    </html>
  )
}