mod store;
mod services;
mod routes;
mod middleware;
mod db;
mod email;
#[cfg(test)]
mod tests;

use glideapi::{App, Config};
use sqlx::postgres::PgPoolOptions;
use store::Store;

#[derive(Clone)]
pub struct AppState {
    pub store: Store,
    pub db:    sqlx::PgPool,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cowri=info,sqlx=warn".into()),
        )
        .init();

    // Fail fast on missing secrets
    for var in &["JWT_SECRET", "PAYSTACK_SECRET_KEY", "DATABASE_URL"] {
        if std::env::var(var).is_err() {
            eprintln!("FATAL: {var} environment variable is not set");
            std::process::exit(1);
        }
    }

    // ── Database ──────────────────────────────────────────────────────────────
    let database_url = std::env::var("DATABASE_URL").unwrap();
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    db::run_migrations(&pool).await.expect("Migration failed");
    tracing::info!("Migrations applied");

    // ── Outbox worker (background) ────────────────────────────────────────────
    tokio::spawn(db::outbox_worker(pool.clone()));
    tracing::info!("Outbox worker started");

    let cors_origin = std::env::var("CORS_ORIGIN").ok();

    // ── Hydrate in-memory store from Postgres ─────────────────────────────────
    let store = store::Store::load_from_db(&pool).await
        .expect("Failed to load store from DB");

    // ── Schedule worker (Ajo auto-debit ticks) ─────────────────────────────────
    tokio::spawn(services::schedules::schedule_worker(pool.clone(), store.clone()));
    tracing::info!("Schedule worker started");

    let state = AppState { store, db: pool };

    // ── Web client (React, in web/) ───────────────────────────────────────────
    // Serving it from this process means production needs no CORS setup and no
    // second origin: the app and the API it talks to are the same host. Falls
    // back to API-only if the client hasn't been built — `cargo run -p backend`
    // works before anyone has run `npm run build` in web/.
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "web/dist".into());

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let addr = format!("0.0.0.0:{port}");
    tracing::info!(" Cowri API on http://{addr}");

    let mut app = App::new()
        .config(Config { cors_origin, ..Config::default() })
        .state(state)
        .route("POST", "/v1/auth/register",       routes::register)
        .route("POST", "/v1/auth/verify-email",   routes::verify_email)
        .route("POST", "/v1/auth/resend-otp",     routes::resend_otp)
        .route("POST", "/v1/auth/forgot-password", routes::forgot_password)
        .route("POST", "/v1/auth/reset-password",  routes::reset_password)
        .route("POST", "/v1/auth/login",           routes::login)
        .route("POST", "/v1/auth/refresh",         routes::refresh_token)
        .route("POST", "/v1/auth/logout",          routes::logout)
        .route("GET",  "/v1/wallet",               routes::get_wallet)
        .route("GET",  "/v1/notifications",         routes::list_notifications)
        .route("POST", "/v1/kyc/verify-bvn",         routes::verify_bvn)
        .route("POST", "/v1/media/presign",          routes::presign_media_upload)
        .route("POST", "/v1/media/confirm",          routes::confirm_media_upload)
        .route("DELETE", "/v1/media/:id",            routes::delete_media)
        .route("GET",  "/v1/wallet/transactions",  routes::get_transactions)
        .route("POST", "/v1/wallet/fund",          routes::fund_wallet)
        .route("POST", "/v1/webhook/paystack",     routes::paystack_webhook)
        .route("GET",  "/v1/ajo",                  routes::list_ajo)
        .route("POST", "/v1/ajo",                  routes::create_ajo)
        .route("GET",  "/v1/ajo/:id",              routes::get_ajo)
        .route("GET",  "/v1/ajo/:id/invite",       routes::ajo_invite)
        .route("POST", "/v1/ajo/:id/close",        routes::close_ajo)
        .route("POST", "/v1/ajo/:id/members/:member_id/remove", routes::remove_ajo_member)
        .route("POST", "/v1/ajo/:id/join",         routes::join_ajo)
        .route("POST", "/v1/ajo/:id/contribute",   routes::contribute_ajo)
        .route("POST", "/v1/ajo/:id/payment-mode", routes::set_ajo_payment_mode)
        .route("POST", "/v1/payments/mandates",    routes::save_payment_mandate)
        .route("GET",  "/v1/payments/mandates",    routes::list_payment_mandates)
        .route("POST", "/v1/payments/mandates/initialize", routes::initialize_mandate)
        .route("GET",  "/v1/bills",                routes::list_bills)
        .route("POST", "/v1/bills",                routes::create_bill)
        .route("GET",  "/v1/bills/:id",            routes::get_bill_detail)
        .route("POST", "/v1/bills/:id/pay",        routes::pay_bill)
        .route("POST", "/v1/bills/:id/installment-plan", routes::set_bill_installment_plan)
        .route("POST", "/v1/bills/:id/gift",       routes::gift_bill_share)
        .route("POST", "/v1/payments/p2p",         routes::p2p_payment)
        .route("GET",  "/v1/health",               routes::health)
        .route("GET",  "/v1/ledger/check",         routes::ledger_check)
        // Admin
        .route("GET",  "/v1/admin/dashboard",      routes::admin::dashboard)
        .route("GET",  "/v1/admin/users",          routes::admin::list_users)
        .route("GET",  "/v1/admin/users/:id",      routes::admin::get_user)
        .route("POST", "/v1/admin/users/:id/role", routes::admin::set_user_role)
        .route("GET",  "/v1/admin/transactions",   routes::admin::list_transactions)
        .route("GET",  "/v1/admin/ajo",            routes::admin::list_all_ajo)
        .route("GET",  "/v1/admin/outbox",         routes::admin::outbox_status)
        .route("POST", "/v1/admin/bootstrap",      routes::admin::bootstrap_admin);

    if std::path::Path::new(&static_dir).join("index.html").is_file() {
        app = app.serve_spa(static_dir);
    } else {
        tracing::warn!(
            "No built web client at {static_dir}/index.html — run `npm run build` in web/ to serve it. API-only for now."
        );
    }

    app.listen(&addr).await;
}
