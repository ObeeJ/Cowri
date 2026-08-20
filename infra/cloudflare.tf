data "cloudflare_zone" "root" {
  name = var.root_domain
}

# Full (strict): Cloudflare validates a real certificate on the origin, not
# just any TLS listener. That's why the deploy stack runs a Caddy sidecar in
# front of the Rust API (see docker-compose.prod.yml) — it gets its own
# Let's Encrypt certificate for api.<root_domain> automatically, so the
# Cloudflare-to-origin leg is genuinely encrypted and verified end to end,
# not just terminated at the edge. For a wallet app, "Flexible" mode
# (cleartext to the origin) isn't an acceptable default.
resource "cloudflare_zone_settings_override" "root" {
  zone_id = data.cloudflare_zone.root.id
  settings {
    ssl                      = "full_strict"
    always_use_https         = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"
  }
}
