/**
 * Cloudflare Worker: API gateway in front of the Railway-hosted Rust API.
 * Attach a custom domain (api.example.com) and set RAILWAY_API_ORIGIN.
 */
export default {
  async fetch(request, env) {
    const origin = (env.RAILWAY_API_ORIGIN || '').replace(/\/+$/, '')
    if (!origin) {
      return new Response('RAILWAY_API_ORIGIN is not set', { status: 500 })
    }
    const incoming = new URL(request.url)
    const upstream = new URL(incoming.pathname + incoming.search, origin)
    const headers = new Headers(request.headers)
    headers.set('x-forwarded-host', incoming.host)
    headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''))
    const init = {
      method: request.method,
      headers,
      redirect: 'follow',
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body
    }
    return fetch(upstream, init)
  },
}
