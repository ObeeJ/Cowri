resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.root.id
  name    = var.api_subdomain
  type    = "A"
  content = hcloud_server.api.ipv4_address
  # Orange-clouded — traffic goes through Cloudflare's proxy (WAF, DDoS
  # protection, caching), not straight to the Hetzner IP. This is what the
  # firewall rules in firewall.tf assume when they lock 80/443 to
  # Cloudflare's published ranges.
  proxied = true
  ttl     = 1 # ttl is ignored by Cloudflare when proxied — 1 means "automatic"
}

# media.<root_domain> is wired up in r2.tf via cloudflare_r2_custom_domain,
# which manages its own DNS + certificate — no separate record needed here.
