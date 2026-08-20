import { chromium } from 'playwright'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:4173'
const OUT = process.env.OUT_DIR

const routes = [
  ['/', 'home'],
  ['/how-ajo-works', 'how-ajo-works'],
  ['/split-bills', 'split-bills'],
  ['/security', 'security'],
  ['/terms', 'terms'],
  ['/privacy', 'privacy'],
  ['/design-system', 'design-system'],
  ['/login', 'login'],
  ['/register', 'register'],
  ['/verify-email', 'verify-email'],
  ['/forgot-pin', 'forgot-pin'],
  ['/reset-pin', 'reset-pin'],
  ['/nonexistent-page', '404'],
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
  const page = await context.newPage()
  const problems = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  const h1 = await page.locator('h1').first().textContent().catch(() => null)
  const bodyText = (await page.locator('body').innerText()).trim()

  // Ignore the expected failure to reach the API from a static preview.
  const real = problems.filter(
    (p) => !/Failed to load resource|net::ERR|Could not reach Cowri|localhost:3000/.test(p),
  )

  if (real.length > 0 || bodyText.length < 40) {
    failures++
    console.log(`FAIL ${path}`)
    for (const p of real) console.log(`   ${p}`)
    if (bodyText.length < 40) console.log(`   body too short: ${JSON.stringify(bodyText)}`)
  } else {
    console.log(`ok   ${path}  h1="${(h1 ?? '').slice(0, 48)}"`)
  }

  if (OUT) {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  }
  await context.close()
}

// Dark theme + mobile pass on the home page and the docs.
for (const [path, name] of [['/', 'home-dark'], ['/design-system', 'docs-dark']]) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  if (scrollWidth > clientWidth + 1) {
    failures++
    console.log(`FAIL ${path} (mobile): horizontal overflow ${scrollWidth} > ${clientWidth}`)
  } else {
    console.log(`ok   ${path} (mobile dark, no overflow)`)
  }
  if (OUT) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  await context.close()
}

await browser.close()
console.log(failures === 0 ? '\nAll routes rendered.' : `\n${failures} failing route(s).`)
process.exit(failures === 0 ? 0 : 1)
