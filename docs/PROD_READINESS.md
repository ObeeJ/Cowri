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

1. **No live Railway/staging URL** with real `DATABASE_URL` + Paystack webhook wired.
2. **Mandate link UI / save authorization** after first successful charge — schema exists; user consent flow incomplete.
3. **Ajo auto payment-mode API** to attach mandate + create `payment_schedules` row from product UI.
4. **DB integration / restart E2E in CI** (`COWRI_PAYMENTS_MODE=mock` + Postgres) — unit tests still use in-memory Ajo contribute under `#[cfg(test)]`.
5. **BVN hash salting** not yet applied.
6. **In-memory Store** still hydrated for reads; money-out no longer trusts it as cash, but dual-write drift on ajo cycle after webhook until restart remains a risk (hydrate or sync store on settle).
7. **Branch protection / production secrets** — human ops on GitHub + Railway.
8. **Gift UI** on bill detail (API only so far).
9. **Installment plan UI** (API + validator only).

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
