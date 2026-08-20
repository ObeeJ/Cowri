-- Migration: 002_kyc_media_circle_supervisor
-- Adds KYC, avatar, and media support, plus a "cancelled" circle status.
-- A real forward migration rather than editing 001 — anyone who already
-- applied 001 as it stood in master keeps a working checksum history.

-- ── Users: KYC + avatar ───────────────────────────────────────────────────────
-- Only a one-way hash of the BVN is ever stored, never the number itself —
-- Prembly is the system of record for the raw BVN, Cowri only needs to know
-- the outcome and (via the hash) that it hasn't already been used to verify
-- a different account.
ALTER TABLE users
    ADD COLUMN kyc_status         TEXT        NOT NULL DEFAULT 'unverified'
                                   CHECK (kyc_status IN ('unverified','pending','verified','failed')),
    ADD COLUMN kyc_verified_at    TIMESTAMPTZ,
    ADD COLUMN kyc_provider       TEXT,
    ADD COLUMN kyc_reference      TEXT,
    ADD COLUMN kyc_failure_reason TEXT,
    ADD COLUMN bvn_hash           TEXT,
    ADD COLUMN avatar_url         TEXT;

-- One verified BVN can back exactly one account.
CREATE UNIQUE INDEX idx_users_bvn_hash ON users(bvn_hash) WHERE bvn_hash IS NOT NULL;

-- ── Ajo: circle supervisor ────────────────────────────────────────────────────
-- A circle an admin has closed — join_group and contribute both already gate
-- on status = 'active', so this is the only schema change removing/closing a
-- circle needs.
ALTER TABLE ajo_groups DROP CONSTRAINT ajo_groups_status_check;
ALTER TABLE ajo_groups ADD CONSTRAINT ajo_groups_status_check
    CHECK (status IN ('active','completed','paused','cancelled'));

-- ── Media ─────────────────────────────────────────────────────────────────────
-- One row per object actually confirmed uploaded to R2 — the presign step
-- itself writes nothing here, since a presigned URL that's issued but never
-- used should never look like a real upload.
CREATE TABLE media (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    object_key    TEXT        NOT NULL UNIQUE,
    purpose       TEXT        NOT NULL,
    content_type  TEXT        NOT NULL,
    size_bytes    BIGINT      NOT NULL CHECK (size_bytes > 0),
    public_url    TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_media_user ON media(user_id);
