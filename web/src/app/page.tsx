'use client'

import dynamic from 'next/dynamic'

// The whole app is a client-rendered SPA: auth state, theme, and routing all
// read from `window` (cookies, localStorage, matchMedia) on first render, none
// of which exists during static export's prerender pass. Loading it with
// `ssr: false` keeps the exported HTML an empty shell — same as the old Vite
// build's bare `<div id="root"></div>` — and mounts everything client-side.
const App = dynamic(() => import('./app-client'), { ssr: false })

export default function Page() {
  return <App />
}
