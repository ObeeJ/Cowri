/**
 * A stand-in for the Cowri API, used to render the authenticated screens in a
 * browser without a Postgres and a Paystack key.
 *
 * It mirrors the response shapes in backend/src/routes and shared/src/lib.rs
 * exactly, including kobo integers and snake_case enums. It is a development
 * aid only: no auth, no persistence, no ledger.
 *
 *   node mock-api.mjs   # listens on http://localhost:3000
 */

import { createServer } from 'node:http'

const ORIGIN = process.env.MOCK_ORIGIN ?? 'http://localhost:4173'
const uid = '11111111-1111-4111-8111-111111111111'

const user = {
  id: uid,
  name: 'Adaeze Nwosu',
  phone: '08031234567',
  email: 'adaeze@example.com',
  role: 'admin',
  email_verified: true,
  kyc_status: 'verified',
  created_at: '2026-02-11T09:14:00Z',
}

const wallet = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: uid,
  available_kobo: 4_875_000,
  ledger_kobo: 5_125_000,
  version: 17,
}

const day = 86_400_000
const now = Date.now()

const transactions = [
  ['credit', 2_000_000, 'fund-a1', 'Wallet top-up via Paystack', 2 * 3_600_000],
  ['debit', 500_000, 'ajo-b2', 'Ajo contribution: Owambe Circle', 6 * 3_600_000],
  ['debit', 187_500, 'bill-c3', 'Bill split payment', 1 * day],
  ['credit', 497_500, 'ajo-d4', 'Ajo payout: Owambe Circle', 2 * day],
  ['debit', 500_000, 'ajo-e5', 'Ajo contribution: Owambe Circle', 8 * day],
  ['credit', 1_000_000, 'fund-f6', 'Wallet top-up via Paystack', 9 * day],
].map(([kind, amount_kobo, reference, description, ago], index) => ({
  id: `tx-${index}`,
  wallet_id: wallet.id,
  kind,
  amount_kobo,
  reference,
  description,
  status: 'success',
  created_at: new Date(now - ago).toISOString(),
}))

const groups = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Owambe Circle',
    admin_id: uid,
    contribution_kobo: 500_000,
    frequency: 'weekly',
    member_count: 5,
    current_cycle: 2,
    status: 'active',
    created_at: new Date(now - 40 * day).toISOString(),
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Alaba Traders',
    admin_id: 'other',
    contribution_kobo: 1_000_000,
    frequency: 'monthly',
    member_count: 4,
    current_cycle: 3,
    status: 'completed',
    created_at: new Date(now - 200 * day).toISOString(),
  },
]

const bills = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    title: 'Dinner at Terra Kulture',
    creator_id: uid,
    total_kobo: 750_000,
    status: 'partially_paid',
    created_at: new Date(now - 3 * day).toISOString(),
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    title: 'Lagos to Ibadan trip fuel',
    creator_id: 'other',
    total_kobo: 420_000,
    status: 'settled',
    created_at: new Date(now - 20 * day).toISOString(),
  },
]

const routes = {
  'GET /v1/wallet': () => wallet,
  'GET /v1/wallet/transactions': () => transactions,
  'GET /v1/ajo': () => groups,
  'GET /v1/bills': () => bills,
  'GET /v1/health': () => ({ status: 'ok', db: 'ok', version: '0.1.0' }),
  'GET /v1/notifications': () => [],
  'GET /v1/ledger/check': () => ({ status: 'ok', checked: 128, violations: [] }),
  'GET /v1/admin/dashboard': () => ({
    users: 214,
    wallets: 214,
    total_balance_kobo: 187_450_000,
    transactions: 1_902,
    volume_kobo: 942_100_000,
    ajo_groups: 37,
    active_groups: 22,
    bills: 145,
    contributions: 611,
    fee_revenue_kobo: 1_527_500,
  }),
  'GET /v1/admin/users': () => ({
    users: [
      { id: uid, name: user.name, phone: user.phone, role: 'admin', kyc_status: 'verified', balance_kobo: 4_875_000, created_at: user.created_at },
      { id: 'aaaa1111-0000-4000-8000-000000000001', name: 'Tunde Bakare', phone: '08099887766', role: 'user', kyc_status: 'pending', balance_kobo: 1_250_000, created_at: '2026-03-02T10:00:00Z' },
      { id: 'bbbb2222-0000-4000-8000-000000000002', name: 'Ngozi Eze', phone: '07011223344', role: 'user', kyc_status: 'unverified', balance_kobo: 0, created_at: '2026-05-19T16:30:00Z' },
    ],
    total: 3,
  }),
  'GET /v1/admin/transactions': () => ({
    transactions,
    total: 1_902,
    page: 0,
    per_page: 50,
  }),
  'GET /v1/admin/ajo': () => ({
    groups: groups.map((group) => ({
      group,
      member_count: group.id.startsWith('33') ? 5 : 4,
      total_contributions: group.id.startsWith('33') ? 12 : 16,
      fee_collected_kobo: group.id.startsWith('33') ? 30_000 : 80_000,
    })),
    total: groups.length,
  }),
  'GET /v1/admin/outbox': () => ({ pending: 3, delivered: 1_874, failed: 0, total: 1_877 }),
}

function detailFor(path) {
  const ajo = path.match(/^\/v1\/ajo\/([^/]+)$/)
  if (ajo) {
    const group = groups.find((candidate) => candidate.id === ajo[1]) ?? groups[0]
    return {
      group,
      members: Array.from({ length: group.member_count }, (_, index) => ({
        user_id: index === 2 ? uid : `member-${index}`,
        payout_position: index,
        has_received: index < group.current_cycle,
      })),
      contributions_this_cycle: 3,
      members_total: group.member_count,
    }
  }

  const invite = path.match(/^\/v1\/ajo\/([^/]+)\/invite$/)
  if (invite) {
    return { invite_url: `http://localhost:4173/ajo/join/${invite[1]}`, group_id: invite[1] }
  }

  const billMatch = path.match(/^\/v1\/bills\/([^/]+)$/)
  if (billMatch) {
    const bill = bills.find((candidate) => candidate.id === billMatch[1]) ?? bills[0]
    const shares = [
      { user_id: uid, share_kobo: Math.floor(bill.total_kobo / 4), paid: false },
      { user_id: 'part-2', share_kobo: Math.floor(bill.total_kobo / 4), paid: true },
      { user_id: 'part-3', share_kobo: Math.floor(bill.total_kobo / 4), paid: true },
      { user_id: 'part-4', share_kobo: Math.floor(bill.total_kobo / 4), paid: false },
    ]
    return { bill, participants: shares, my_share: { share_kobo: shares[0].share_kobo, paid: false } }
  }

  return null
}

createServer((request, response) => {
  const path = request.url.split('?')[0]
  const key = `${request.method} ${path}`

  response.setHeader('access-control-allow-origin', ORIGIN)
  response.setHeader('access-control-allow-credentials', 'true')
  response.setHeader('access-control-allow-headers', 'content-type, x-idempotency-key')
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  response.setHeader('content-type', 'application/json')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const handler = routes[key]
  const body = handler ? handler() : detailFor(path)

  if (body === null || body === undefined) {
    response.writeHead(404)
    response.end(JSON.stringify({ error: 'Not found in the mock API' }))
    return
  }

  response.writeHead(200)
  response.end(JSON.stringify(body))
}).listen(3000, () => console.log('Mock Cowri API on http://localhost:3000'))
