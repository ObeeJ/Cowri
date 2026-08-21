/**
 * Serves the static export from `out/` for local previewing, the same way
 * `vite preview` used to: static files with an SPA fallback to `index.html`
 * for client-side routes, plus a `/v1` proxy to a locally running API so the
 * production build works with zero config and no CORS setup either side.
 *
 *   node preview-server.mjs   # listens on http://localhost:4173
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const PORT = 4173
const OUT_DIR = path.join(import.meta.dirname, 'out')
const API_ORIGIN = 'http://localhost:3000'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json; charset=utf-8',
}

async function serveStatic(req, res, reqPath) {
  const rel = reqPath.replace(/^\/+/, '')
  const candidate = path.join(OUT_DIR, rel || 'index.html')
  if (!candidate.startsWith(OUT_DIR)) {
    res.writeHead(403).end()
    return
  }

  try {
    const stats = await stat(candidate)
    if (stats.isFile()) {
      const body = await readFile(candidate)
      res.writeHead(200, { 'content-type': MIME[path.extname(candidate)] ?? 'application/octet-stream' })
      res.end(body)
      return
    }
  } catch {
    // Not a real file — fall through to the SPA fallback below.
  }

  const lastSegment = rel.split('/').pop() ?? ''
  if (lastSegment.includes('.')) {
    res.writeHead(404).end('Not found')
    return
  }

  const body = await readFile(path.join(OUT_DIR, 'index.html'))
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(body)
}

async function proxyApi(req, res) {
  const target = API_ORIGIN + req.url
  const headers = { ...req.headers }
  delete headers.host

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

  const response = await fetch(target, { method: req.method, headers, body })
  const responseBody = Buffer.from(await response.arrayBuffer())
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(responseBody)
}

const server = createServer((req, res) => {
  const reqPath = new URL(req.url, `http://localhost:${PORT}`).pathname
  if (reqPath.startsWith('/v1')) {
    void proxyApi(req, res)
    return
  }
  void serveStatic(req, res, reqPath)
})

server.listen(PORT, () => console.log(`Preview server on http://localhost:${PORT} (API proxied from ${API_ORIGIN})`))
