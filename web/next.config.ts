import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import { tanstackRouter } from '@tanstack/router-plugin/webpack'

// Static export to `out/` (Next's default) — Cloudflare Pages builds from
// there (see infra/pages.tf), and the Rust backend can serve the same folder
// directly for local/interim deployments (see backend/src/main.rs's
// serve_spa and its STATIC_DIR default), the same way the previous Vite
// build was served. No Node process needed in either case, just files on
// disk. The app is a client-rendered single-page app — TanStack Router owns
// navigation — so one static shell covers every route.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true }, // next/image's optimizer needs a server; static export has none
  trailingSlash: false,
  webpack: (config) => {
    config.plugins.push(tanstackRouter({ target: 'react', autoCodeSplitting: true }))
    return config
  },
  // In dev this reproduces the same-origin /v1 call against a locally running
  // API, with zero config and no CORS setup either side. `next export` skips
  // rewrites entirely, so this has no effect on the static production build.
  async rewrites() {
    return [{ source: '/v1/:path*', destination: 'http://localhost:3000/v1/:path*' }]
  },
}

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // The old registration script was a bare `serviceWorker.register()` with no
  // extra behaviour, so match that here rather than opting into Serwist's
  // reload-on-reconnect default.
  reloadOnOnline: false,
})

export default withSerwist(nextConfig)
