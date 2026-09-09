# Cowri production readiness — status (2026-08-22)

**Verdict: NOT prod-ready yet.** Core money model rewrite is in place; live deploy + DB-backed E2E + mandate linking UI remain.

## Done in this pass

| Area | Status |
|---|---|
| ADR: no custody / obligations | `docs/adr/001-no-custody-obligations.md` |
| Migration `003_obligations_psp.sql` | obligations, attempts, mandates, schedules, installments, bill deadlines |
| Bill create requires `deadline_at`; `complete_by = deadline - 24h` | Yes |
| Bill pay → Paystack checkout (not in-memory debit) | Yes |
| Bill partial amounts | Yes (API + UI amount field) |
| Installment plan validation | Yes (API + unit tests) |
| Gift bill share | API `POST /v1/bills/:id/gift` |
| P2P send | API `POST /v1/payments/p2p` + `/send` UI |
| Ajo contribute → checkout | Yes |
| Webhook settle-by-reference | Yes; unmatched recorded in `webhook_orphans` |
| Schedule worker skeleton | Yes (mandate charge path) |
| `ledger_check` admin-only | Yes |
| Admin role persisted to Postgres | Yes |
| Dockerfile installs `curl` for healthcheck | Yes |
| GHCR image forced lowercase | Yes |
| Railway starter config | `railway.toml` |
| Display-only wallet copy | Wallet page + types |
| Unit tests | **29 passed** |

## Still blocking a true SHIP

1. **You** plug secrets and custom domains (see `docs/DEPLOY.md`): Railway + Supabase `DATABASE_URL`, Cloudflare Pages, R2, Worker gateway, Paystack webhook URL. The repo is wired for that; live URLs are operator work.
2. GitHub branch protection / production environment secrets — human ops.

## How to run locally (mock PSP)

```bash
export DATABASE_URL=postgres://...
export JWT_SECRET=...
export PAYSTACK_SECRET_KEY=sk_test_...
export COWRI_PAYMENTS_MODE=mock   # checkout URLs are mock://... ; webhook HMAC skipped
cargo run -p backend
```

Simulate settlement:

```bash
curl -X POST http://localhost:3000/v1/webhook/paystack \
  -H 'content-type: application/json' \
  -d '{"event":"charge.success","data":{"reference":"<ref-from-checkout>","amount":10000}}'
```
