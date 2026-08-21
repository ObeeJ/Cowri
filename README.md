# Cowri

A fintech web application for Nigerians — digital rotating savings circles (Ajo/Esusu), bill splitting, and wallet management, built on Paystack.

A Rust REST API serves a React web client (`web/`) and, in production, serves the client's own build directly — one process, one origin, no CORS to configure.

---

## Features

- **Wallet** — fund via Paystack, track available and ledger balance, browse transaction history
- **Ajo circles** — create and join rotating savings circles with automatic contribution and payout rotation; the admin can remove a member ahead of their payout or close the circle
- **Bill splitting** — split an expense among participants by phone number, settle your share from your wallet
- **Auth** — phone + password registration and login, email OTP verification, password reset, and a separate transaction PIN that gates every money-moving action
- **Identity verification (KYC)** — BVN verification via Prembly, with status tracked per account
- **Profile media** — profile photo upload via signed Cloudflare R2 uploads
- **Notifications** — real-time in-app toasts and transactional email for money received, a circle contribution, or a bill share getting paid
- **Admin console** — user and role management, transaction and circle oversight, an outbox/delivery view, and a ledger integrity check
- **PWA** — installable, with an offline-capable service worker for static assets and fonts

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Rust, GlideAPI (in-house HTTP framework), Tokio, Postgres (sqlx) |
| Web client | React 19, Next.js (static export), TanStack Router, TanStack Query, Tailwind v4, Bun |
| Payments | Paystack |
| Identity verification | Prembly (BVN Basic) |
| Email | SMTP via lettre |
| Media storage | Cloudflare R2 |
| Infrastructure | Terraform (Hetzner, Neon, Cloudflare), Docker, Caddy |

---

## Project structure

```
cowri/
├── glideapi/     # The HTTP framework the API is built on
├── shared/       # Shared types and DTOs (User, Wallet, AjoGroup, Bill, …)
├── backend/      # REST API — also serves web/out as a static single-page app
│   └── src/
│       ├── services/   # auth, wallet, ajo, bills, kyc, media
│       ├── routes/     # HTTP handlers, including routes/admin
│       ├── store/      # In-memory store hydrated from Postgres
│       └── middleware.rs
├── web/          # React web client (see web/README.md)
│   └── src/
│       ├── routes/     # Marketing, auth, app and admin routes (TanStack Router)
│       ├── components/ # ui primitives, domain surfaces, layouts
│       └── lib/        # api client, money, auth, theme
└── infra/        # Terraform for Hetzner, Neon and Cloudflare (see infra/README.md)
```

---

## Getting started

### Prerequisites

- Rust (stable) and Postgres
- [Bun](https://bun.sh), for the web client

### Environment

Copy `backend/.env.example` to `backend/.env` and fill it in. At minimum, to run the API against a local Postgres:

```env
DATABASE_URL=postgres://cowri:cowri@localhost:5432/cowri
JWT_SECRET=some-random-string-at-least-32-bytes-long
PAYSTACK_SECRET_KEY=sk_test_your_key_here
```

Everything else in `backend/.env.example` is grouped by feature (email, KYC, media, admin bootstrap) and documented inline — set only the groups you're working on. `docker compose up db` starts a local Postgres if you don't already have one.

### Run, day to day

Two processes, with the web client talking to the API through a dev proxy so neither CORS nor an API URL needs configuring:

```bash
# Backend (port 3000)
cargo run -p backend

# Web client (port 5173) — rewrites /v1 to the backend above
cd web && bun install && bun run dev
```

### Run as it deploys

In production the backend serves the web client's own build, so the whole app is one process on one origin:

```bash
cd web && bun install && bun run build   # writes web/out
cd .. && cargo run -p backend --release  # picks up web/out automatically
```

`STATIC_DIR` overrides where the backend looks for a build (default `web/out`, resolved relative to the working directory the API is started from). If no build is found there, the API still runs, just without serving a client — useful when working on the backend alone.

The `Dockerfile` builds both in this order and produces a single image; `docker-compose.yml` runs that image alongside Postgres and Redis for local full-stack testing.

The React client is documented in [`web/README.md`](web/README.md), and its component library, with props and live examples, is served at `/design-system`.

---

## API reference

Every route is served under the `/v1` prefix.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/v1/auth/register` | Register with name, phone, email and password. Sends an email OTP |
| POST | `/v1/auth/verify-email` | Confirm the 6 digit OTP |
| POST | `/v1/auth/resend-otp` | Send a fresh verification code |
| POST | `/v1/auth/forgot-password` | Send a password reset code |
| POST | `/v1/auth/reset-password` | Set a new password with the reset code |
| POST | `/v1/auth/login` | Sign in. Sets the session cookies, returns user and wallet |
| POST | `/v1/auth/refresh` | Rotate the session cookies |
| POST | `/v1/auth/logout` | Invalidate the session server side |
| GET | `/v1/wallet` | Wallet balance, available and ledger, in kobo |
| GET | `/v1/wallet/transactions` | Transaction history, paginated |
| POST | `/v1/wallet/fund` | Initialise a Paystack top-up. Honours `x-idempotency-key` |
| POST | `/v1/webhook/paystack` | Paystack webhook receiver, HMAC verified |
| GET | `/v1/notifications` | The caller's recent notifications |
| POST | `/v1/kyc/verify-bvn` | Submit a BVN for verification via Prembly |
| POST | `/v1/media/presign` | Get a signed URL to upload media to R2 |
| POST | `/v1/media/confirm` | Confirm an upload and attach it (e.g. as a profile photo) |
| DELETE | `/v1/media/:id` | Remove an uploaded media item |
| GET | `/v1/ajo` | List the caller's savings circles |
| POST | `/v1/ajo` | Create a circle |
| GET | `/v1/ajo/:id` | Circle detail. Members only |
| GET | `/v1/ajo/:id/invite` | Invite link. Circle admin only |
| POST | `/v1/ajo/:id/join` | Take the next open seat |
| POST | `/v1/ajo/:id/contribute` | Contribute for the current cycle |
| POST | `/v1/ajo/:id/close` | Close the circle. Admin only |
| POST | `/v1/ajo/:id/members/:member_id/remove` | Remove a member ahead of their payout. Admin only |
| GET | `/v1/bills` | List the caller's bills, paginated |
| POST | `/v1/bills` | Create and split a bill |
| GET | `/v1/bills/:id` | Bill detail. Participants only |
| POST | `/v1/bills/:id/pay` | Pay your share |
| GET | `/v1/health` | Liveness, including a Postgres ping |
| GET | `/v1/ledger/check` | Recompute every wallet from its ledger entries |
| GET | `/v1/admin/dashboard` | Aggregate stats: users, active circles, bills, fee revenue |
| GET | `/v1/admin/users` | List users |
| GET | `/v1/admin/users/:id` | User detail, including KYC status |
| POST | `/v1/admin/users/:id/role` | Promote or demote a user |
| GET | `/v1/admin/transactions` | List transactions across all wallets |
| GET | `/v1/admin/ajo` | List every circle |
| GET | `/v1/admin/outbox` | Notification/email delivery status |
| POST | `/v1/admin/bootstrap` | One-time: promote the caller to admin, gated by `ADMIN_BOOTSTRAP_SECRET` |

Authentication is by httpOnly cookie. `POST /v1/auth/login` sets `access_token` and `refresh_token` as `HttpOnly; Secure; SameSite=Strict` cookies; browser clients send them with `credentials: 'include'` and never read them. A bearer `Authorization` header is also accepted, for server-to-server callers that hold a token by other means. Every `/v1/admin/*` route additionally requires the admin role, checked server side regardless of what a client believes.

A separate transaction PIN (`/v1/wallet/fund`, `/v1/ajo/:id/contribute`, `/v1/bills/:id/pay`, …) is required for anything that moves money, independent of the login password.

Amounts are integers counted in kobo. No endpoint accepts or returns a decimal amount.

---

## Paystack webhook

For local development, expose the backend with [ngrok](https://ngrok.com):

```bash
ngrok http 3000
```

Set `https://<your-ngrok-url>/webhook/paystack` as the webhook URL in your Paystack dashboard.

---

## Deployment

`infra/` holds the Terraform for the Hetzner VPS, Neon Postgres and Cloudflare (DNS, Pages, R2, CDN) — see [`infra/README.md`](infra/README.md). `.github/workflows/deploy.yml` builds and pushes the Docker image and rolls it out via `docker-compose.prod.yml` and Caddy.

---

## License

MIT
