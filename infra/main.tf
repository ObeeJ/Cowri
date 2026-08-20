# Deliberately thin — every resource lives in the file named after the
# service that owns it (hetzner.tf, neon.tf, cloudflare.tf, r2.tf, pages.tf,
# dns.tf, firewall.tf) rather than one large main.tf. This file only holds
# what's genuinely shared across them.

locals {
  common_tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}
