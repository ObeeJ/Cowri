# Cowri

A fintech web application for Nigerians — digital rotating savings (Ajo/Esusu), bill splitting, and wallet management with Paystack payments.

Rust REST API on the backend, serving a React web client (`web/`). In production the API serves the client's built assets itself, so the whole app is one process on one origin.

---

## Features

- **Wallet** — fund via Paystack, track balance and transaction history
- **Ajo Groups** — create and manage digital rotating savings circles with automatic contribution and payout logic
- **Bill Splitting** — split expenses among participants by phone number, settle shares from wallet
- **Auth** — phone + PIN registration and login with JWT sessions
- **PWA** — installable progressive web app with offline support via service worker

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust, GlideAPI, Tokio, Postgres |
| Web client | React 19, TanStack Router, TanStack Query, Tailwind v4 |
| Payments | Paystack |

---

## Project Structure

```
cowri/
├── glideapi/     # The HTTP framework the API is built on
├── shared/       # Shared types and DTOs (User, Wallet, AjoGroup, Bill)
├── backend/      # REST API — also serves web/dist as a single-page app
│   └── src/
│       ├── services/   # auth, wallet, ajo, bills
│       ├── routes/     # HTTP handlers
│       ├── store/      # In-memory store hydrated from Postgres
│       └── middleware.rs
└── web/          # React web client (see web/README.md)
    └── src/
        ├── routes/     # Marketing, auth, app and admin routes
        ├── components/ # ui primitives, domain surfaces, layouts
        └── lib/        # api client, money, auth, theme
```

---

## Getting Started

### Prerequisites

- Rust (stable) and Postgres
- Node 22+, for the web client

### Environment

Create `backend/.env`:

```env
DATABASE_URL=postgres://cowri:cowri@localhost:5432/cowri
JWT_SECRET=some-random-string-at-least-32-bytes-long
PAYSTACK_SECRET_KEY=sk_test_your_key_here
```

### Run, day to day

Two processes, with the web client talking to the API through a dev proxy so
neither CORS nor an API URL needs configuring:

```bash
# Backend (port 3000)
cargo run -p backend

# Web client (port 5173) — proxies /v1 to the backend above
cd web && npm install && npm run dev
```

### Run as it deploys

In production the backend serves the web client's own build, so the whole app
is one process on one origin:

```bash
cd web && npm install && npm run build   # writes web/dist
cd .. && cargo run -p backend --release  # picks up web/dist automatically
```

`STATIC_DIR` overrides where the backend looks for a build (default
`web/dist`, resolved relative to the working directory the API is started
from). If no build is found there, the API still runs, just without serving a
client — useful when working on the backend alone.

The `Dockerfile` builds both in this order and produces a single image.

The React client is documented in [`web/README.md`](web/README.md), and its
component library, with props and live examples, is served at `/design-system`.

---

## API Reference

Every route is served under the `/v1` prefix.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Register with name, phone, email and PIN. Sends an email OTP |
| POST | `/v1/auth/verify-email` | Confirm the 6 digit OTP |
| POST | `/v1/auth/resend-otp` | Send a fresh verification code |
| POST | `/v1/auth/forgot-pin` | Send a PIN reset code |
| POST | `/v1/auth/reset-pin` | Set a new PIN with the reset code |
| POST | `/v1/auth/login` | Sign in. Sets the session cookies, returns user and wallet |
| POST | `/v1/auth/refresh` | Rotate the session cookies |
| POST | `/v1/auth/logout` | Invalidate the session server side |
| GET | `/v1/wallet` | Wallet balance, available and ledger, in kobo |
| GET | `/v1/wallet/transactions` | Transaction history, paginated |
| POST | `/v1/wallet/fund` | Initialise a Paystack top-up. Honours `x-idempotency-key` |
| POST | `/v1/webhook/paystack` | Paystack webhook receiver, HMAC verified |
| GET | `/v1/ajo` | List the caller's savings circles |
| POST | `/v1/ajo` | Create a circle |
| GET | `/v1/ajo/:id` | Circle detail. Members only |
| GET | `/v1/ajo/:id/invite` | Invite link. Circle admin only |
| POST | `/v1/ajo/:id/join` | Take the next open seat |
| POST | `/v1/ajo/:id/contribute` | Contribute for the current cycle |
| GET | `/v1/bills` | List the caller's bills, paginated |
| POST | `/v1/bills` | Create and split a bill |
| GET | `/v1/bills/:id` | Bill detail. Participants only |
| POST | `/v1/bills/:id/pay` | Pay your share |
| GET | `/v1/health` | Liveness, including a Postgres ping |
| GET | `/v1/ledger/check` | Recompute every wallet from its ledger entries |
| GET | `/v1/admin/*` | Dashboard, users, roles, transactions, circles, outbox. Admin only |

Authentication is by httpOnly cookie. `POST /v1/auth/login` sets `access_token`
and `refresh_token` as `HttpOnly; Secure; SameSite=Strict` cookies; browser
clients send them with `credentials: 'include'` and never read them. A bearer
`Authorization` header is also accepted, for server-to-server callers that hold
a token by other means.

Amounts are integers counted in kobo. No endpoint accepts or returns a decimal
amount.

---

## Paystack Webhook

For local development, expose the backend with [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Set `https://<your-ngrok-url>/webhook/paystack` as the webhook URL in your Paystack dashboard.

---

## License

MIT
