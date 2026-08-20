import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Adaeze Nwosu',
  phone: '08031234567',
  email: 'adaeze@example.com',
  role: 'admin',
  email_verified: true,
  created_at: '2026-02-11T09:14:00Z',
}

const routes = [
  ['/dashboard', 'app-dashboard'],
  ['/wallet', 'app-wallet'],
  ['/ajo', 'app-ajo-list'],
  ['/ajo/new', 'app-ajo-new'],
  ['/ajo/33333333-3333-4333-8333-333333333333', 'app-ajo-detail'],
  ['/bills', 'app-bills-list'],
  ['/bills/new', 'app-bills-new'],
  ['/bills/55555555-5555-4555-8555-555555555555', 'app-bill-detail'],
  ['/settings', 'app-settings'],
  ['/admin', 'admin-overview'],
  ['/admin/users', 'admin-users'],
  ['/admin/transactions', 'admin-transactions'],
  ['/admin/ajo', 'admin-ajo'],
  ['/admin/health', 'admin-health'],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-proxy-server'],
})

async function capture(path, name, scheme, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: scheme })
  await context.addInitScript((cached) => {
    window.localStorage.setItem('cowri.profile.v1', JSON.stringify(cached))
  }, profile)
  const page = await context.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: viewport.height < 900 })
  await context.close()
  console.log(`captured ${name}`)
}

for (const [path, name] of routes) {
  await capture(path, `${name}-light`, 'light', { width: 1280, height: 900 })
}

// Dark mode for a representative few.
for (const [path, name] of [
  ['/dashboard', 'app-dashboard'],
  ['/admin', 'admin-overview'],
]) {
  await capture(path, `${name}-dark`, 'dark', { width: 1280, height: 900 })
}

// Mobile for the dashboard and bottom nav.
await capture('/dashboard', 'app-dashboard-mobile', 'light', { width: 390, height: 844 })

await browser.close()
