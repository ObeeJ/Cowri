/// <reference lib="webworker" />
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Mirrors the previous vite-plugin-pwa (Workbox) config: `registerType: 'prompt'`
// meant a new service worker never force-activates, so `skipWaiting`/`clientsClaim`
// stay unset here too — the update model is unchanged.
//
// No `navigateFallback`: Next's static export renders HTML after webpack has
// already run, so the page document is never one of the precached URLs (only
// `_next/static` assets and `public/` files are). Binding a navigate fallback
// to an unprecached URL throws at startup, so navigation requests are left to
// go to the network, same as everything under /v1 already does.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.origin === 'https://fonts.googleapis.com',
      handler: new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
    },
    {
      matcher: ({ url }) => url.origin === 'https://fonts.gstatic.com',
      handler: new CacheFirst({
        cacheName: 'google-fonts-files',
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
  ],
})

serwist.addEventListeners()
