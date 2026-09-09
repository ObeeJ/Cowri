use crate::store::Store;
use crate::services::{auth, ajo, bills, wallet, notifications};
use chrono::{Duration, Utc};
use shared::*;

fn test_store() -> Store { Store::new() }

const TEST_PASSWORD: &str = "correct-horse-battery-9";
const TEST_TXN_PIN: &str  = "1234";

fn register_user(store: &Store, phone: &str, name: &str) -> uuid::Uuid {
    std::env::set_var("JWT_SECRET", "test-secret-that-is-long-enough-32b");
    let req = RegisterRequest {
        name: name.into(), phone: phone.into(),
        email: format!("{}@test.com", phone),
        password: TEST_PASSWORD.into(),
        transaction_pin: TEST_TXN_PIN.into(),
    };
    let tokens = auth::register(store, req).unwrap();
    // Auto-verify in tests — no email server needed
    let uid = tokens.user.id;
    store.users.lock().unwrap().get_mut(&uid).unwrap().email_verified = true;
    uid
}

// ── Auth ──────────────────────────────────────────────────────────────────────

#[test]
fn register_and_login_ok() {
    let store = test_store();
    let uid = register_user(&store, "08011111111", "Alice");
    let res = auth::login(&store, LoginRequest { phone: "08011111111".into(), password: TEST_PASSWORD.into() });
    assert!(res.is_ok());
    assert_eq!(res.unwrap().user.id, uid);
}

#[test]
fn duplicate_phone_rejected() {
    let store = test_store();
    register_user(&store, "08022222222", "Bob");
    let res = auth::register(&store, RegisterRequest {
        name: "Bob2".into(), phone: "08022222222".into(),
        email: "bob2@test.com".into(), password: TEST_PASSWORD.into(), transaction_pin: "5678".into(),
    });
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("already registered"));
}

#[test]
fn wrong_pin_rejected() {
    let store = test_store();
    register_user(&store, "08033333333", "Carol");
    let res = auth::login(&store, LoginRequest { phone: "08033333333".into(), password: "wrong-password-999".into() });
    assert!(res.is_err());
}

#[test]
fn rate_limit_locks_after_5_failures() {
    let store = test_store();
    register_user(&store, "08044444444", "Dave");
    for _ in 0..5 {
        let _ = auth::login(&store, LoginRequest { phone: "08044444444".into(), password: "wrong-password-000".into() });
    }
    let res = auth::login(&store, LoginRequest { phone: "08044444444".into(), password: TEST_PASSWORD.into() });
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("Too many"));
}

#[test]
fn refresh_token_single_use() {
    let store = test_store();
    register_user(&store, "08055555555", "Eve");
    let tokens = auth::login(&store, LoginRequest { phone: "08055555555".into(), password: TEST_PASSWORD.into() }).unwrap();
    let (_, new_refresh) = auth::rotate_refresh_token(&store, &tokens.refresh_token).unwrap();
    // Old token must be rejected
    let res = auth::rotate_refresh_token(&store, &tokens.refresh_token);
    assert!(res.is_err());
    // New token must work
    assert!(auth::rotate_refresh_token(&store, &new_refresh).is_ok());
}

// ── Wallet ────────────────────────────────────────────────────────────────────

#[test]
fn debit_insufficient_balance_rejected() {
    let store = test_store();
    let uid = register_user(&store, "08066666666", "Frank");
    let res = wallet::debit_wallet(&store, uid, 10_000, "ref", "test", TEST_TXN_PIN);
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("Insufficient"));
}

#[test]
fn credit_then_debit_updates_balance() {
    let store = test_store();
    let uid = register_user(&store, "08077777777", "Grace");
    wallet::credit_wallet(&store, uid, 50_000, "ref1", "top-up");
    wallet::debit_wallet(&store, uid, 20_000, "ref2", "spend", TEST_TXN_PIN).unwrap();
    let w = wallet::get_wallet(&store, uid).unwrap();
    assert_eq!(w.available_kobo, 30_000);
}

#[test]
fn debit_rejects_wrong_transaction_pin() {
    let store = test_store();
    let uid = register_user(&store, "08077777778", "Hank");
    wallet::credit_wallet(&store, uid, 50_000, "ref1", "top-up");
    // Login password is never enough on its own — a stolen session cookie
    // still can't move money without the separate transaction PIN.
    let res = wallet::debit_wallet(&store, uid, 20_000, "ref2", "spend", "0000");
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("transaction PIN"));
    let w = wallet::get_wallet(&store, uid).unwrap();
    assert_eq!(w.available_kobo, 50_000, "balance must be untouched on a rejected PIN");
}

// ── Ajo ───────────────────────────────────────────────────────────────────────

#[test]
fn ajo_cycle_advances_after_all_contribute() {
    let store = test_store();
    let admin = register_user(&store, "08088888881", "Admin");
    let member = register_user(&store, "08088888882", "Member");

    // Fund both wallets
    wallet::credit_wallet(&store, admin,  100_000, "r1", "fund");
    wallet::credit_wallet(&store, member, 100_000, "r2", "fund");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Test Ajo".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 2,
    }).unwrap();

    ajo::join_group(&store, group.id, member).unwrap();

    // Both contribute — cycle should advance
    ajo::contribute(&store, group.id, admin, TEST_TXN_PIN).unwrap();
    ajo::contribute(&store, group.id, member, TEST_TXN_PIN).unwrap();

    let updated = store.ajo_groups.lock().unwrap().get(&group.id).cloned().unwrap();
    assert_eq!(updated.current_cycle, 1);
}

#[test]
fn ajo_duplicate_contribution_rejected() {
    let store = test_store();
    let admin  = register_user(&store, "08099999991", "Admin2");
    let member = register_user(&store, "08099999992", "Member2");
    wallet::credit_wallet(&store, admin,  100_000, "r1", "fund");
    wallet::credit_wallet(&store, member, 100_000, "r2", "fund");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Solo".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 2,
    }).unwrap();
    ajo::join_group(&store, group.id, member).unwrap();

    // First contribution succeeds
    ajo::contribute(&store, group.id, admin, TEST_TXN_PIN).unwrap();
    // Second contribution in same cycle rejected
    let res = ajo::contribute(&store, group.id, admin, TEST_TXN_PIN);
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("Already contributed"));
}

#[test]
fn ajo_non_member_cannot_contribute() {
    let store = test_store();
    let admin   = register_user(&store, "08011100001", "Admin3");
    let outsider = register_user(&store, "08011100002", "Outsider");
    wallet::credit_wallet(&store, outsider, 100_000, "r", "fund");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Private".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 2,
    }).unwrap();

    let res = ajo::contribute(&store, group.id, outsider, TEST_TXN_PIN);
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("Not a member"));
}

#[test]
fn ajo_contribute_rejects_wrong_transaction_pin() {
    let store = test_store();
    let admin = register_user(&store, "08011100003", "Admin4");
    wallet::credit_wallet(&store, admin, 100_000, "r1", "fund");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Guarded".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 2,
    }).unwrap();

    let res = ajo::contribute(&store, group.id, admin, "0000");
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("transaction PIN"));
}

// ── Circle supervision ──────────────────────────────────────────────────────────

#[test]
fn close_group_is_admin_only_and_blocks_future_activity() {
    let store = test_store();
    let admin  = register_user(&store, "08077000001", "Admin5");
    let member = register_user(&store, "08077000002", "Member5");
    let outsider = register_user(&store, "08077000003", "Outsider5");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Closeable".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 2,
    }).unwrap();
    ajo::join_group(&store, group.id, member).unwrap();

    // A non-admin can't close it.
    let res = ajo::close_group(&store, group.id, member);
    assert!(res.unwrap_err().error.contains("Only the group admin"));

    // The admin can.
    ajo::close_group(&store, group.id, admin).unwrap();
    let updated = store.ajo_groups.lock().unwrap().get(&group.id).cloned().unwrap();
    assert_eq!(updated.status, AjoStatus::Cancelled);

    // Closed means closed — no further joins or contributions.
    let join_res = ajo::join_group(&store, group.id, outsider);
    assert!(join_res.unwrap_err().error.contains("not active"));
    wallet::credit_wallet(&store, member, 100_000, "r", "fund");
    let contribute_res = ajo::contribute(&store, group.id, member, TEST_TXN_PIN);
    assert!(contribute_res.unwrap_err().error.contains("not active"));

    // Closing an already-closed circle is rejected, not a silent no-op.
    let res = ajo::close_group(&store, group.id, admin);
    assert!(res.unwrap_err().error.contains("not active"));
}

#[test]
fn remove_member_renumbers_the_remaining_rotation() {
    let store = test_store();
    let admin = register_user(&store, "08077100001", "Admin6");
    let m1    = register_user(&store, "08077100002", "M1");
    let m2    = register_user(&store, "08077100003", "M2");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Trio".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 3,
    }).unwrap();
    ajo::join_group(&store, group.id, m1).unwrap(); // position 1
    ajo::join_group(&store, group.id, m2).unwrap(); // position 2

    // Remove the middle member (position 1) — m2 should shift down to 1.
    let removed_position = ajo::remove_member(&store, group.id, admin, m1).unwrap();
    assert_eq!(removed_position, 1);

    let members = store.ajo_members.lock().unwrap();
    assert!(!members.contains_key(&(group.id, m1)), "removed member is gone");
    assert_eq!(members.get(&(group.id, m2)).unwrap().payout_position, 1, "m2 shifted down");
    drop(members);

    let updated = store.ajo_groups.lock().unwrap().get(&group.id).cloned().unwrap();
    assert_eq!(updated.member_count, 2, "target size shrank to match");
}

#[test]
fn remove_member_rejects_admin_self_removal_and_past_receivers() {
    let store = test_store();
    let admin = register_user(&store, "08077200001", "Admin7");
    let m1    = register_user(&store, "08077200002", "M1b");
    let m2    = register_user(&store, "08077200003", "M2b");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Guarded".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 3,
    }).unwrap();
    ajo::join_group(&store, group.id, m1).unwrap(); // position 1
    ajo::join_group(&store, group.id, m2).unwrap(); // position 2

    // Admin can't remove themselves.
    let res = ajo::remove_member(&store, group.id, admin, admin);
    assert!(res.unwrap_err().error.contains("cannot remove themselves"));

    // Complete cycle 0: everyone contributes, admin (position 0) receives,
    // current_cycle advances to 1.
    wallet::credit_wallet(&store, admin, 100_000, "r1", "fund");
    wallet::credit_wallet(&store, m1,    100_000, "r2", "fund");
    wallet::credit_wallet(&store, m2,    100_000, "r3", "fund");
    ajo::contribute(&store, group.id, admin, TEST_TXN_PIN).unwrap();
    ajo::contribute(&store, group.id, m1,    TEST_TXN_PIN).unwrap();
    ajo::contribute(&store, group.id, m2,    TEST_TXN_PIN).unwrap();

    // m1 is now at position 1, which is <= the new current_cycle (1) — their
    // payout is imminent/in progress, so they can no longer be removed.
    let res = ajo::remove_member(&store, group.id, admin, m1);
    assert!(res.unwrap_err().error.contains("already received"));

    // m2 (position 2) is still safely in the future and remains removable.
    assert!(ajo::remove_member(&store, group.id, admin, m2).is_ok());
}

#[test]
fn remove_member_rejects_someone_who_already_contributed_this_cycle() {
    let store = test_store();
    let admin = register_user(&store, "08077300001", "Admin8");
    let m1    = register_user(&store, "08077300002", "M1c");
    let m2    = register_user(&store, "08077300003", "M2c");

    let group = ajo::create_group(&store, admin, CreateAjoRequest {
        name: "Early payer".into(), contribution_kobo: 10_000,
        frequency: AjoFrequency::Monthly, member_count: 3,
    }).unwrap();
    ajo::join_group(&store, group.id, m1).unwrap(); // position 1
    ajo::join_group(&store, group.id, m2).unwrap(); // position 2, future

    // m2's payout position is safely in the future, but everyone contributes
    // every cycle regardless of whose turn it is — m2 pays into cycle 0
    // (funding the admin's payout) before anyone tries to remove them.
    wallet::credit_wallet(&store, m2, 100_000, "r1", "fund");
    ajo::contribute(&store, group.id, m2, TEST_TXN_PIN).unwrap();

    // Removing m2 now must be rejected — their contribution already moved
    // money and can't be un-sent, and letting the removal through would
    // shrink member_count while contributions_this_cycle still counts them,
    // completing the cycle without m1 ever having to pay in.
    let res = ajo::remove_member(&store, group.id, admin, m2);
    assert!(res.unwrap_err().error.contains("already contributed this cycle"));

    // m1, who hasn't contributed yet, remains removable.
    assert!(ajo::remove_member(&store, group.id, admin, m1).is_ok());
}

// ── Bills ─────────────────────────────────────────────────────────────────────

#[test]
fn bill_creator_share_not_auto_paid_and_complete_by_is_24h_early() {
    let store = test_store();
    let creator = register_user(&store, "08022200001", "Creator");
    let _payer  = register_user(&store, "08022200002", "Payer");

    let deadline = Utc::now() + Duration::days(5);
    let bill = bills::create_bill(&store, creator, CreateBillRequest {
        title: "Dinner".into(), total_kobo: 20_000,
        participant_phones: vec!["08022200002".into()],
        deadline_at: deadline,
    }).unwrap();

    let p = store.bill_participants.lock().unwrap()
        .get(&(bill.id, creator)).cloned().unwrap();
    assert!(!p.paid);
    assert_eq!(p.amount_paid_kobo, 0);
    assert_eq!(bill.complete_by_at, deadline - Duration::hours(24));
}

#[test]
fn bill_deadline_must_be_more_than_24h_out() {
    let store = test_store();
    let creator = register_user(&store, "08022200009", "Creator");
    let res = bills::create_bill(&store, creator, CreateBillRequest {
        title: "Too soon".into(), total_kobo: 10_000,
        participant_phones: vec![],
        deadline_at: Utc::now() + Duration::hours(12),
    });
    assert!(res.is_err());
}

#[test]
fn installment_plan_must_sum_to_share_and_finish_before_complete_by() {
    let complete_by = Utc::now() + Duration::days(4);
    let ok_plan = vec![
        InstallmentPlanItem { amount_kobo: 350, due_at: Utc::now() + Duration::days(1) },
        InstallmentPlanItem { amount_kobo: 350, due_at: Utc::now() + Duration::days(2) },
        InstallmentPlanItem { amount_kobo: 300, due_at: Utc::now() + Duration::days(3) },
    ];
    assert!(bills::validate_installment_plan(1_000, complete_by, &ok_plan).is_ok());

    let bad_sum = vec![
        InstallmentPlanItem { amount_kobo: 500, due_at: Utc::now() + Duration::days(1) },
    ];
    assert!(bills::validate_installment_plan(1_000, complete_by, &bad_sum).unwrap_err().error.contains("sum"));

    let too_late = vec![
        InstallmentPlanItem { amount_kobo: 1_000, due_at: complete_by + Duration::hours(1) },
    ];
    assert!(bills::validate_installment_plan(1_000, complete_by, &too_late).unwrap_err().error.contains("complete-by"));
}

// ── Ledger Invariant ──────────────────────────────────────────────────────────

#[test]
fn ledger_invariant_holds_after_credit_and_debit() {
    let store = test_store();
    let uid = register_user(&store, "08055500001", "Ledger");
    wallet::credit_wallet(&store, uid, 100_000, "ref-c1", "top-up");
    wallet::credit_wallet(&store, uid, 50_000,  "ref-c2", "top-up");
    wallet::debit_wallet(&store, uid, 30_000,   "ref-d1", "spend", TEST_TXN_PIN).unwrap();

    let wallet_id = store.wallets.lock().unwrap().get(&uid).unwrap().id;
    wallet::assert_ledger_invariant(&store, wallet_id).expect("ledger invariant violated");
}

#[test]
fn ledger_entries_are_append_only() {
    let store = test_store();
    let uid = register_user(&store, "08055500002", "Append");
    wallet::credit_wallet(&store, uid, 20_000, "r1", "fund");
    wallet::debit_wallet(&store, uid, 10_000, "r2", "spend", TEST_TXN_PIN).unwrap();

    let ledger = store.ledger.lock().unwrap();
    // Exactly 2 entries — no updates, no deletes
    let wallet_id = store.wallets.lock().unwrap().get(&uid).unwrap().id;
    let entries: Vec<_> = ledger.iter().filter(|e| e.wallet_id == wallet_id).collect();
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0].kind, shared::EntryKind::Credit);
    assert_eq!(entries[1].kind, shared::EntryKind::Debit);
}

#[test]
fn outbox_events_staged_not_delivered_inline() {
    let store = test_store();
    let uid = register_user(&store, "08055500003", "Outbox");
    wallet::credit_wallet(&store, uid, 50_000, "r1", "fund");
    wallet::debit_wallet(&store, uid, 20_000, "r2", "spend", TEST_TXN_PIN).unwrap();

    let outbox = store.outbox.lock().unwrap();
    // Both operations staged outbox events
    assert!(outbox.len() >= 2);
    // All must be Pending — none delivered inline
    assert!(outbox.iter().all(|e| e.status == shared::OutboxStatus::Pending));
}

// ── Notifications ─────────────────────────────────────────────────────────────

#[test]
fn notifications_target_only_the_recipient() {
    let store = test_store();
    let alice = register_user(&store, "08066700001", "Alice");
    let bob   = register_user(&store, "08066700002", "Bob");

    wallet::credit_wallet(&store, alice, 50_000, "r1", "fund");
    wallet::debit_wallet(&store, alice, 10_000, "r2", "spend", TEST_TXN_PIN).unwrap();

    let alice_notifications = notifications::list_for_user(&store, alice);
    let bob_notifications = notifications::list_for_user(&store, bob);

    assert_eq!(alice_notifications.len(), 2, "credit and debit both notify Alice");
    assert!(alice_notifications[0].kind == "wallet.debited", "newest first");
    assert!(bob_notifications.is_empty(), "Bob's wallet never moved");
}

// ── KYC ───────────────────────────────────────────────────────────────────────

#[tokio::test]
async fn bvn_format_is_rejected_before_any_network_call() {
    // Wrong length and non-digits must fail fast, without needing
    // PREMBLY_API_KEY set or any network access — this is the guard that
    // runs before the provider is ever contacted.
    for bad in ["123", "", "12345678901234", "1234567890a"] {
        let res = crate::services::kyc::verify_bvn(bad).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().error.contains("11 digits"));
    }
}

#[test]
fn bvn_hash_is_peppered_not_plain_sha256() {
    std::env::set_var("JWT_SECRET", "test-secret-that-is-long-enough-32b");
    std::env::set_var("BVN_HASH_PEPPER", "unit-test-pepper");
    let bvn = "22112345678";
    let salted = crate::services::kyc::hash_bvn(bvn);
    let legacy = crate::services::kyc::hash_bvn_legacy(bvn);
    assert_ne!(salted, legacy);
    assert_eq!(salted.len(), 64);
}

/// Requires DATABASE_URL (set in CI). Skips locally when Postgres is absent.
#[tokio::test]
async fn bill_share_stays_paid_after_store_reload() {
    let Ok(url) = std::env::var("DATABASE_URL") else { return };
    std::env::set_var("COWRI_PAYMENTS_MODE", "mock");
    std::env::set_var("JWT_SECRET", "test-secret-that-is-long-enough-32b");
    std::env::set_var("PAYSTACK_SECRET_KEY", "sk_test_ci");

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .expect("connect");
    crate::db::run_migrations(&pool).await.expect("migrate");

    let store = crate::store::Store::new();
    let n = (uuid::Uuid::new_v4().as_u128() % 10_000_000) as u32;
    let phone_c = format!("0801{n:07}");
    let phone_p = format!("0802{n:07}");
    let creator = register_user(&store, &phone_c, "CreatorE2E");
    let _payer = register_user(&store, &phone_p, "PayerE2E");

    let creator_user = store.users.lock().unwrap().get(&creator).cloned().unwrap();
    let creator_wallet = store.wallets.lock().unwrap().get(&creator).cloned().unwrap();
    let pw = store.passwords.lock().unwrap().get(&creator).cloned().unwrap();
    let pin = store.transaction_pins.lock().unwrap().get(&creator).cloned().unwrap();
    crate::db::persist_user(&pool, &creator_user, &pw, &pin, &creator_wallet).await.unwrap();

    let payer_id = store.phone_index.lock().unwrap().get(&phone_p).copied().unwrap();
    let payer_user = store.users.lock().unwrap().get(&payer_id).cloned().unwrap();
    let payer_wallet = store.wallets.lock().unwrap().get(&payer_id).cloned().unwrap();
    let ppw = store.passwords.lock().unwrap().get(&payer_id).cloned().unwrap();
    let ppin = store.transaction_pins.lock().unwrap().get(&payer_id).cloned().unwrap();
    crate::db::persist_user(&pool, &payer_user, &ppw, &ppin, &payer_wallet).await.unwrap();

    let bill = bills::create_bill(&store, creator, CreateBillRequest {
        title: "E2E dinner".into(),
        total_kobo: 20_000,
        participant_phones: vec![phone_p],
        deadline_at: Utc::now() + Duration::days(5),
    }).unwrap();
    let participants: Vec<(uuid::Uuid, i64)> = store
        .bill_participant_index.lock().unwrap()
        .get(&bill.id).cloned().unwrap_or_default()
        .iter()
        .filter_map(|uid| {
            store.bill_participants.lock().unwrap().get(&(bill.id, *uid)).map(|p| (*uid, p.share_kobo))
        })
        .collect();
    crate::db::persist_bill(&pool, &bill, &participants).await.unwrap();

    let session = bills::initiate_bill_payment(
        &store,
        &pool,
        bill.id,
        creator,
        &PayBillRequest { transaction_pin: TEST_TXN_PIN.into(), amount_kobo: None },
        &format!("e2e-{}", bill.id),
    ).await.expect("checkout");

    crate::db::settle_payment_attempt(&pool, &session.reference, session.amount_kobo)
        .await
        .expect("settle");

    // Simulate process restart: new in-memory store from Postgres only.
    let reloaded = crate::store::Store::load_from_db(&pool).await.expect("reload");
    let p = reloaded.bill_participants.lock().unwrap()
        .get(&(bill.id, creator)).cloned().expect("participant");
    assert!(p.paid, "share must stay paid after reload");
    assert!(p.amount_paid_kobo > 0);
}

// ── Media ─────────────────────────────────────────────────────────────────────

#[test]
fn presign_upload_rejects_bad_input_before_any_r2_call() {
    use crate::services::media;
    let uid = uuid::Uuid::new_v4();

    let too_big = media::presign_upload(uid, "image/png", 20 * 1024 * 1024, "avatar");
    assert!(too_big.unwrap_err().error.contains("10MB"));

    let zero = media::presign_upload(uid, "image/png", 0, "avatar");
    assert!(zero.is_err());

    let bad_type = media::presign_upload(uid, "application/pdf", 1000, "avatar");
    assert!(bad_type.unwrap_err().error.contains("JPEG, PNG or WebP"));

    let bad_purpose = media::presign_upload(uid, "image/png", 1000, "not a valid purpose!");
    assert!(bad_purpose.unwrap_err().error.contains("Invalid upload purpose"));
}

// ── Concurrency Stress Test ───────────────────────────────────────────────────

#[test]
fn concurrent_debits_never_overdraft() {
    use std::sync::Arc;
    use std::thread;

    let store = Arc::new(test_store());
    let uid   = register_user(&store, "08066600001", "Concurrent");

    // Fund with exactly 1000 kobo
    wallet::credit_wallet(&store, uid, 1000, "fund", "seed");

    // 10 threads each try to debit 200 kobo — only 5 should succeed
    let handles: Vec<_> = (0..10).map(|i| {
        let s = store.clone();
        thread::spawn(move || {
            wallet::debit_wallet(&s, uid, 200, &format!("debit-{i}"), "concurrent", TEST_TXN_PIN)
        })
    }).collect();

    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
    let successes = results.iter().filter(|r| r.is_ok()).count();
    let failures  = results.iter().filter(|r| r.is_err()).count();

    // Exactly 5 succeed (5 × 200 = 1000), 5 fail with insufficient balance
    assert_eq!(successes, 5, "expected exactly 5 successful debits");
    assert_eq!(failures,  5, "expected exactly 5 insufficient balance errors");

    // Balance must be exactly 0 — no overdraft
    let w = wallet::get_wallet(&store, uid).unwrap();
    assert_eq!(w.available_kobo, 0, "balance must be 0 after exact spend");

    // Ledger invariant must still hold
    let wallet_id = store.wallets.lock().unwrap().get(&uid).unwrap().id;
    wallet::assert_ledger_invariant(&store, wallet_id).expect("ledger invariant violated after concurrency");
}

// ── Email verification ────────────────────────────────────────────────────────

#[test]
fn unverified_user_cannot_login() {
    let store = test_store();
    let req = RegisterRequest {
        name: "Unverified".into(), phone: "08099100001".into(),
        email: "unverified@test.com".into(), password: TEST_PASSWORD.into(), transaction_pin: TEST_TXN_PIN.into(),
    };
    auth::register(&store, req).unwrap();
    // Do NOT verify — login should fail
    let res = auth::login(&store, LoginRequest { phone: "08099100001".into(), password: TEST_PASSWORD.into() });
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("not verified"));
}

#[test]
fn otp_verify_flow() {
    let store = test_store();
    let req = RegisterRequest {
        name: "Verified".into(), phone: "08099100002".into(),
        email: "verified@test.com".into(), password: TEST_PASSWORD.into(), transaction_pin: TEST_TXN_PIN.into(),
    };
    let tokens = auth::register(&store, req).unwrap();
    let otp = tokens.otp.unwrap();

    // Wrong OTP rejected
    let bad = auth::verify_otp(&store, "verified@test.com", "000000");
    assert!(bad.is_err());

    // Correct OTP accepted
    auth::verify_otp(&store, "verified@test.com", &otp).unwrap();

    // Login now works
    let login = auth::login(&store, LoginRequest { phone: "08099100002".into(), password: TEST_PASSWORD.into() });
    assert!(login.is_ok());
}

#[test]
fn otp_expires_after_max_attempts() {
    let store = test_store();
    let req = RegisterRequest {
        name: "Lockout".into(), phone: "08099100003".into(),
        email: "lockout@test.com".into(), password: TEST_PASSWORD.into(), transaction_pin: TEST_TXN_PIN.into(),
    };
    auth::register(&store, req).unwrap();

    for _ in 0..5 {
        let _ = auth::verify_otp(&store, "lockout@test.com", "000000");
    }
    let res = auth::verify_otp(&store, "lockout@test.com", "000000");
    assert!(res.is_err());
    assert!(res.unwrap_err().error.contains("Too many"));
}
