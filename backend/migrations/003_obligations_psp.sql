-- Migration: 003_obligations_psp
-- PSP-backed obligations. Cowri does not custody spendable cash.
-- Wallet rows remain a display mirror of activity we choose to show.

-- ── Bills: deadline + complete-by (24h before deadline) ───────────────────────
ALTER TABLE bills
    ADD COLUMN deadline_at    TIMESTAMPTZ,
    ADD COLUMN complete_by_at TIMESTAMPTZ,
    ADD COLUMN timezone       TEXT NOT NULL DEFAULT 'Africa/Lagos';

-- Existing rows (if any): give them a week from now so NOT NULL can apply.
UPDATE bills
SET deadline_at    = COALESCE(deadline_at, created_at + INTERVAL '7 days'),
    complete_by_at = COALESCE(complete_by_at, created_at + INTERVAL '6 days')
WHERE deadline_at IS NULL OR complete_by_at IS NULL;

ALTER TABLE bills
    ALTER COLUMN deadline_at SET NOT NULL,
    ALTER COLUMN complete_by_at SET NOT NULL;

ALTER TABLE bill_participants
    ADD COLUMN amount_paid_kobo BIGINT NOT NULL DEFAULT 0
        CHECK (amount_paid_kobo >= 0);

-- ── Ajo members: manual vs auto ───────────────────────────────────────────────
ALTER TABLE ajo_members
    ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'manual'
        CHECK (payment_mode IN ('manual','auto')),
    ADD COLUMN mandate_id   UUID,
    ADD COLUMN auto_consent_at TIMESTAMPTZ;

-- ── Obligations ───────────────────────────────────────────────────────────────
CREATE TABLE obligations (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    kind             TEXT        NOT NULL CHECK (kind IN ('ajo','bill','gift','p2p','fund_mirror')),
    payer_user_id    UUID        NOT NULL REFERENCES users(id),
    payee_user_id    UUID        REFERENCES users(id),
    amount_kobo      BIGINT      NOT NULL CHECK (amount_kobo > 0),
    amount_paid_kobo BIGINT      NOT NULL DEFAULT 0 CHECK (amount_paid_kobo >= 0),
    status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','partially_paid','settled','failed','cancelled')),
    bill_id          UUID        REFERENCES bills(id) ON DELETE SET NULL,
    ajo_group_id     UUID        REFERENCES ajo_groups(id) ON DELETE SET NULL,
    ajo_cycle        INT,
    beneficiary_user_id UUID     REFERENCES users(id), -- gift: whose share is covered
    idempotency_key  TEXT        NOT NULL UNIQUE,
    metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (amount_paid_kobo <= amount_kobo)
);
CREATE INDEX idx_obligations_payer ON obligations(payer_user_id);
CREATE INDEX idx_obligations_bill  ON obligations(bill_id) WHERE bill_id IS NOT NULL;
CREATE INDEX idx_obligations_ajo   ON obligations(ajo_group_id, ajo_cycle)
    WHERE ajo_group_id IS NOT NULL;

-- ── Payment attempts (PSP) ────────────────────────────────────────────────────
CREATE TABLE payment_attempts (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id      UUID        NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    amount_kobo        BIGINT      NOT NULL CHECK (amount_kobo > 0),
    provider           TEXT        NOT NULL DEFAULT 'paystack',
    provider_reference TEXT        NOT NULL UNIQUE,
    status             TEXT        NOT NULL DEFAULT 'initialized'
                       CHECK (status IN ('initialized','charged','settled','failed')),
    mode               TEXT        NOT NULL DEFAULT 'checkout'
                       CHECK (mode IN ('checkout','mandate')),
    channel_hint       TEXT,
    idempotency_key    TEXT        NOT NULL UNIQUE,
    authorization_url  TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at         TIMESTAMPTZ
);
CREATE INDEX idx_payment_attempts_obligation ON payment_attempts(obligation_id);

-- ── Mandates (saved Paystack authorizations) ──────────────────────────────────
CREATE TABLE payment_mandates (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            TEXT        NOT NULL DEFAULT 'paystack',
    authorization_code  TEXT        NOT NULL,
    email               TEXT        NOT NULL,
    card_last4          TEXT,
    bank                TEXT,
    card_type           TEXT,
    reusable            BOOLEAN     NOT NULL DEFAULT TRUE,
    status              TEXT        NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','revoked','failed')),
    consented_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_mandates_user ON payment_mandates(user_id)
    WHERE status = 'active';

ALTER TABLE ajo_members
    ADD CONSTRAINT ajo_members_mandate_fk
    FOREIGN KEY (mandate_id) REFERENCES payment_mandates(id);

-- ── Schedules (Ajo auto + bill auto) ──────────────────────────────────────────
CREATE TABLE payment_schedules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    kind            TEXT        NOT NULL CHECK (kind IN ('ajo','bill')),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ajo_group_id    UUID        REFERENCES ajo_groups(id) ON DELETE CASCADE,
    bill_id         UUID        REFERENCES bills(id) ON DELETE CASCADE,
    mandate_id      UUID        REFERENCES payment_mandates(id),
    enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
    next_run_at     TIMESTAMPTZ NOT NULL,
    last_run_at     TIMESTAMPTZ,
    lease_owner     TEXT,
    lease_until     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (kind = 'ajo' AND ajo_group_id IS NOT NULL AND bill_id IS NULL) OR
        (kind = 'bill' AND bill_id IS NOT NULL AND ajo_group_id IS NULL)
    )
);
CREATE INDEX idx_payment_schedules_due ON payment_schedules(next_run_at)
    WHERE enabled = TRUE;

-- ── Bill installment plans (payer-chosen) ─────────────────────────────────────
CREATE TABLE bill_installments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id     UUID        NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sequence    INT         NOT NULL CHECK (sequence >= 1),
    amount_kobo BIGINT      NOT NULL CHECK (amount_kobo > 0),
    due_at      TIMESTAMPTZ NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','settled','failed','skipped')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bill_id, user_id, sequence)
);
CREATE INDEX idx_bill_installments_user ON bill_installments(bill_id, user_id);

-- ── Unmatched / orphan webhook audit ──────────────────────────────────────────
CREATE TABLE webhook_orphans (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    provider   TEXT        NOT NULL DEFAULT 'paystack',
    reference  TEXT        NOT NULL,
    payload    JSONB       NOT NULL,
    reason     TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhook_orphans_ref ON webhook_orphans(reference);
