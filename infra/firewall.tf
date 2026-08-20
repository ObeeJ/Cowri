# Cloudflare's published edge IP ranges. HTTP/HTTPS on the origin are locked
# to these so the API is only ever reachable through Cloudflare's proxy —
# never by hitting the Hetzner IP directly, which would skip Cloudflare's
# WAF and DDoS protection entirely. Stable, but not immutable: cross-check
# against https://www.cloudflare.com/ips/ periodically.
locals {
  cloudflare_ipv4 = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
  ]
  cloudflare_ipv6 = [
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
    "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
  ]
}

resource "hcloud_firewall" "api" {
  name = "${var.project_name}-${var.environment}"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.admin_ssh_cidrs
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = concat(local.cloudflare_ipv4, local.cloudflare_ipv6)
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = concat(local.cloudflare_ipv4, local.cloudflare_ipv6)
  }

  # ICMP (ping) from anywhere — harmless, useful for basic reachability checks.
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}
