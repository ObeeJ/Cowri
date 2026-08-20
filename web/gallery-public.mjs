import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = process.argv[2]
mkdirSync(OUT, { recursive: true })

const routes = [
  ['/', 'marketing-home'],
  ['/how-ajo-works', 'marketing-how-ajo-works'],
  ['/split-bills', 'marketing-split-bills'],
  ['/security', 'marketing-security'],
  ['/terms', 'marketing-terms'],
  ['/privacy', 'marketing-privacy'],
  ['/design-system', 'marketing-design-system'],
  ['/login', 'auth-login'],
  ['/register', 'auth-register'],
  ['/verify-email', 'auth-verify-email'],
  ['/forgot-pin', 'auth-forgot-pin'],
  ['/reset-pin', 'auth-reset-pin'],
  ['/this-page-does-not-exist', 'error-404'],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-proxy-server'],
})

for (const [path, name] of routes) {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: scheme,
    })
    const page = await context.newPage()
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(350)
    await page.screenshot({ path: `${OUT}/${name}-${scheme}.png` })
    await context.close()
    console.log(`captured ${name}-${scheme}`)
  }
}

// One mobile pass on the home page.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mpage = await mobile.newPage()
await mpage.goto(BASE + '/', { waitUntil: 'networkidle' })
await mpage.waitForTimeout(350)
await mpage.screenshot({ path: `${OUT}/marketing-home-mobile.png` })
await mobile.close()
console.log('captured marketing-home-mobile')

await browser.close()
