# Cowri web client

The React frontend for the Cowri API. It talks to the existing Rust backend in
`backend/` and adds nothing of its own: no second source of truth for money, no
client-side ledger, no role it can grant itself.

```
npm install
npm run dev               # http://localhost:5173
```

That's the whole setup. `npm run dev` proxies `/v1` to `http://localhost:3000`
(see `vite.config.ts`), so it talks to a locally running API with no `.env`,
and no `CORS_ORIGIN` to configure on the API either — the proxy makes it look
same-origin to the browser. `npm run build` produces the same same-origin call
shape in production, because the backend serves this app's build itself (see
`backend/src/main.rs`). `.env.example` documents the one case that needs an
override: the client deployed separately from the API it talks to.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the route generator watching |
| `npm run build` | Typecheck, then a production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preview` | Serve `dist/` on port 4173 |
| `npm run mock-api` | A stand-in API on port 3000 for working offline |
| `npm run smoke` | Render every public route in Chromium and fail on any console error |
| `npm run smoke:app` | The same for the authenticated routes, against the mock API |

The two smoke scripts need `dist/` built and `npm run preview` running. `smoke:app`
also needs `npm run mock-api`. `smoke` defaults to `http://localhost:4173`; set
`SMOKE_BASE` to point it elsewhere — e.g. `SMOKE_BASE=http://localhost:3000 npm run smoke`
to check the build the real backend is serving, once `cargo run -p backend` has
picked it up. They are development aids, not a test suite: they catch a route
that throws on render, and nothing finer.

## How this app talks to the API

**Same origin, by default.** The backend serves this app's build (see
`serve_spa` in `glideapi/src/lib.rs` and its use in `backend/src/main.rs`), so
in production there is one origin, one cookie jar, and no CORS to configure.
`VITE_COWRI_API_URL` only needs setting if this client is ever deployed
separately from the API — a CDN in front of the app, a different host for the
API — in which case set `CORS_ORIGIN` on the API to this app's origin too, or
the session cookies will be dropped by the browser without a visible error.

**Sessions are cookies, not tokens.** `POST /v1/auth/login` sets `access_token`
and `refresh_token` as httpOnly, Secure, SameSite=Strict cookies and returns
`{ user, wallet }` with no token in the body. This app therefore sends
`credentials: 'include'` on every request and never constructs an `Authorization`
header. It cannot read the cookies, which is the point.

Because there is no `/me` endpoint, "am I signed in?" is answered by calling
`GET /v1/wallet` on boot. The profile from the last sign-in is cached in
`localStorage` so the shell can paint immediately, and it is discarded if that
call comes back 401.

**One refresh at a time.** `POST /v1/auth/refresh` rotates the refresh token, so
two concurrent refreshes would race and one would present a token that has
already been spent. `src/lib/api/client.ts` keeps a single in-flight promise.

**Idempotency on funding.** `POST /v1/wallet/fund` is the one endpoint that
honours `x-idempotency-key` server side, so it is the only place this client
sends one. A retried top-up replays the stored response instead of opening a
second Paystack checkout.

**Money is never a float.** Every amount is an integer count of kobo from the
API to the pixel. `src/lib/money.ts` is the only place formatting or parsing
happens, and `MoneyAmount` is the only component that renders a figure.

**Phone numbers have one canonical form.** The API keys its phone index on the
exact string an account registered with, and matches bill participants by
looking a typed number up in that index. This app normalises everything to the
local 11 digit form with its leading zero, which is what accounts created
through the Leptos client used. Normalising to `+234` or to a bare subscriber
number would lock those accounts out. See `src/components/ui/phone-input.tsx`.

## Structure

```
src/
  styles.css              Design tokens. Both themes redefine the same names.
  main.tsx                Providers and the router
  routes/                 File-based routes; _app is the authenticated layout
  components/
    icons.tsx             The whole icon set, drawn for this product
    ui/                   Primitives: Button, Field, PinInput, Dialog, Toast, …
    domain/               MoneyAmount, BalanceCard, TransactionList, Ajo, Bill, …
    layout/               AppShell, MarketingShell, AuthShell, OfflineNotice
    marketing/            Public page furniture and the product previews
    docs/                 The component documentation renderer
  lib/
    api/                  types.ts, client.ts, hooks.ts, keys.ts
    money.ts              Kobo arithmetic and formatting
    auth.tsx              Session state
    theme.tsx             Light, dark and system
    a11y.ts               Focus trap, dismissal, scroll lock
```

`/design-system` documents every component with its props and a live example.
The previews are the real components, so the page breaks when they do.

## Authorisation

The admin section is gated on the cached profile's role, which decides only what
this app draws. Every `/v1/admin/*` endpoint is gated by `require_admin` on the
API and returns 403 regardless of what the cache says, so tampering with it buys
an empty page and a row of error states.

## Things this client deliberately does not do

- It does not invent participant names. The API returns bill participants and
  circle members as account ids with no names, so the interface says
  "Participant 8f3a…" rather than filling in a person.
- It does not show an optimistic balance after a top-up. Paystack credits the
  wallet through a webhook to the server, so the figure moves when the money
  actually does.
- It does not retry a failed mutation automatically. A double debit should never
  come from a background retry.
- It does not cache API responses in the service worker. Only the app shell and
  fonts are precached; a stale balance is worse than a spinner.

## Known gaps

- There is no endpoint for editing your own name, phone number or email, so the
  settings page shows them read-only and says why.
- There is no withdrawal endpoint, so money moves between Cowri accounts but not
  back out to a bank.
- `POST /v1/admin/users/:id/role` updates the in-memory store only, so a role
  change does not survive an API restart. The UI reflects what the API reports.
- The Terms of Service and Privacy Policy describe what the system actually does
  but carry unfilled placeholders for the operating entity, jurisdiction and
  contact details, and are marked as pending legal review on the page itself.
