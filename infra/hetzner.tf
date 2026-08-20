resource "hcloud_ssh_key" "deploy" {
  name       = "${var.project_name}-deploy"
  public_key = var.ssh_public_key
}

# No separate volume: the database lives in Neon and media lives in R2, so
# the VPS itself only ever holds the Rust binary, Redis's dataset, and
# container images — all comfortably within the boot disk. Add an
# hcloud_volume + mount here if that changes.

resource "hcloud_server" "api" {
  name         = "${var.project_name}-${var.environment}"
  image        = "debian-12"
  server_type  = var.hetzner_server_type
  location     = var.hetzner_location
  ssh_keys     = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.api.id]

  # Hetzner's own snapshot-based backups (daily, 7 rotating slots). Cheap
  # insurance for the one thing that lives only on this box: Redis's data
  # and whatever's on disk between deploys. Nothing here is the system of
  # record — Neon and R2 are — so this is a convenience, not the backup
  # strategy for user data.
  backups = true

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    deploy_ssh_key = var.ssh_public_key
  })

  labels = {
    project     = var.project_name
    environment = var.environment
  }
}
