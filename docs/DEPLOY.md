# Plug-and-play deploy — Railway + Supabase + Cloudflare

Cowri is a **Rust API** (Railway) + **Postgres** (Supabase) + **React app** (Cloudflare Pages) + **R2** (media) + **Worker** (API gateway). Migrations run automatically when the API starts.

You do **not** need Terraform, Hetzner, or Neon.

## 1. Supabase (database)

1. Create a project.
2. Copy **Session pooler** URI (port `5432`, `sslmode=require`).
3. Use it as `DATABASE_URL` on Railway. The API applies `backend/migrations/*.sql` on boot.

If the pooler complains about prepared statements, use the **direct** connection (port `5432` to `db.<ref>.supabase.co`) for the first migrate, or add `?sslmode=require` only.

## 2. Railway (API)

1. New project → Deploy from this GitHub repo.
2. Dockerfile is detected (`railway.toml`).
3. Set variables:

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase URI |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `BVN_HASH_PEPPER` | `openssl rand -hex 32` |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` or live |
| `APP_URL` | `https://app.yourdomain` (Pages origin — Paystack callback) |
| `CORS_ORIGIN` | `https://app.yourdomain` (comma-separate extras) |
| `COOKIE_SAMESITE` | `Strict` if Pages + Worker share a site; `None` if Pages calls Railway origin directly |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_BUCKET_NAME` | e.g. `cowri-media` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token |
| `R2_PUBLIC_URL` | `https://media.yourdomain` |
| `ADMIN_BOOTSTRAP_SECRET` | optional, one-time admin |

Paystack **webhook URL**: `https://api.yourdomain/v1/webhook/paystack` (the Worker hostname).

Public Railway URL is fine as `RAILWAY_API_ORIGIN` for the Worker.

## 3. Cloudflare R2 (media)

1. Create bucket `cowri-media`.
2. Custom domain `media.yourdomain` → public reads.
3. API token with Object Read & Write; paste keys into Railway.

## 4. Cloudflare Worker (API gateway)

```bash
cd cloudflare/gateway
npx wrangler secret put RAILWAY_API_ORIGIN   # https://xxx.up.railway.app
npx wrangler deploy
```

Attach custom domain `api.yourdomain` to the Worker.

## 5. Cloudflare Pages (frontend)

- Root directory: `web`
- Build: `npm ci && npm run build`
- Output: `dist`
- Build env: `VITE_COWRI_API_URL=https://api.yourdomain/v1`

Custom domain: `app.yourdomain` (or apex if you also route `/v1*` to the Worker on that hostname — then omit `VITE_COWRI_API_URL` and keep cookies SameSite=Strict).

## 6. DNS (example)

| Host | Type | Target |
|---|---|---|
| `app` | CNAME | Pages |
| `api` | CNAME / Worker | gateway Worker |
| `media` | CNAME | R2 custom domain |

## Local mock

```bash
export DATABASE_URL=postgres://cowri:cowri@localhost:5432/cowri
export JWT_SECRET=dev-secret-that-is-long-enough-32b
export PAYSTACK_SECRET_KEY=sk_test_placeholder
export COWRI_PAYMENTS_MODE=mock
cargo run -p backend
```
