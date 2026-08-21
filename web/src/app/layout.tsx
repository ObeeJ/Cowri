import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '~/styles.css'

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

// Applies the stored theme before first paint so the page never flashes the
// wrong canvas. Kept inline and tiny for that reason.
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
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#14130f')
    }
  } catch (error) {}
})()
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f4f1ea" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
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
