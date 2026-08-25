# ADR 001 — No custody: obligations + PSP settlement

## Status
Accepted (2026-08-22)

## Context
Cowri is SocialFi (Ajo, bill split, P2P, gifts). We do not hold a payments license.
The previous model treated an in-memory wallet as spendable cash for Ajo/bills.
Debits did not reach Postgres; restarts desynced “paid” flags from balances.

## Decision
1. **Source of truth for money movement** is Paystack (PSP) + durable `obligations` /
   `payment_attempts` rows in Postgres.
2. **`wallets.available_kobo` is a display mirror only** — never the authority to
   move cash for Ajo, bills, gifts, or P2P.
3. Manual pay = hosted checkout (card / transfer / USSD / wallet channels via PSP).
4. Auto-debit = Paystack charge on a saved authorization/mandate, on a schedule
   the user consented to (Ajo frequency set by circle creator; bill installments
   chosen by each payer).
5. Bill shares must be fully settled by `deadline_at - 24 hours` (Africa/Lagos).

## Consequences
- Breaking change: `POST /v1/bills/:id/pay` returns a checkout URL; share is not
  marked paid until webhook settlement.
- Ajo contribute follows the same pattern.
- `db::debit` remains unused for product money-out paths.
- Product copy must not claim Cowri holds customer float.
