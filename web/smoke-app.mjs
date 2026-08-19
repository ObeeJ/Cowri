import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const OUT = process.env.OUT_DIR

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
  ['/ajo', 'app-ajo'],
  ['/ajo/new', 'app-ajo-new'],
  ['/ajo/33333333-3333-4333-8333-333333333333', 'app-ajo-detail'],
  ['/bills', 'app-bills'],
  ['/bills/new', 'app-bills-new'],
  ['/bills/55555555-5555-4555-8555-555555555555', 'app-bill-detail'],
  ['/settings', 'app-settings'],
  ['/admin', 'app-admin'],
  ['/admin/users', 'app-admin-users'],
  ['/admin/transactions', 'app-admin-transactions'],
  ['/admin/ajo', 'app-admin-ajo'],
  ['/admin/health', 'app-admin-health'],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  // The sandbox routes outbound traffic through a proxy that resets the
  // connection to a local port. These servers are both on this machine.
  args: ['--no-proxy-server'],
})
let failures = 0

for (const [path, name] of routes) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript((cached) => {
    window.localStorage.setItem('cowri.profile.v1', JSON.stringify(cached))
  }, profile)

  const page = await context.newPage()
  const problems = []
  page.on('console', (msg) => {
    const text = msg.text()
    // Google Fonts is unreachable from this sandbox without the outbound
    // proxy, which the API calls need bypassed. Font failures are not the
    // subject of this test.
    if (msg.type() === 'error' && !/ERR_CERT_AUTHORITY_INVALID|fonts\.g/.test(text)) {
      problems.push(`console: ${text}`)
    }
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  const h1 = await page.locator('h1').first().textContent().catch(() => null)
  const text = (await page.locator('body').innerText()).trim()
  const stillLoading = text.includes('Checking your session')
  const redirected = page.url().includes('/login')

  if (problems.length > 0 || stillLoading || redirected) {
    failures++
    console.log(`FAIL ${path}${redirected ? ' (redirected to /login)' : ''}${stillLoading ? ' (stuck on session check)' : ''}`)
    for (const problem of problems) console.log(`   ${problem}`)
  } else {
    console.log(`ok   ${path}  h1="${(h1 ?? '').slice(0, 44)}"`)
  }

  if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` })
  await context.close()
}

await browser.close()
console.log(failures === 0 ? '\nAll authenticated routes rendered.' : `\n${failures} failing route(s).`)
process.exit(failures === 0 ? 0 : 1)
