output "server_ipv4" {
  description = "Hetzner server's public IPv4 — what the deploy workflow SSHes to."
  value       = hcloud_server.api.ipv4_address
}

output "api_url" {
  description = "Public URL the Rust API is reachable on."
  value       = "https://${var.api_subdomain}.${var.root_domain}"
}

output "media_url" {
  description = "Public base URL for R2-hosted media."
  value       = "https://${var.media_subdomain}.${var.root_domain}"
}

output "neon_connection_uri" {
  description = "Postgres connection string for the production branch — this is DATABASE_URL. Never logged or printed by CI; read it with `terraform output -raw neon_connection_uri` and pipe it straight into wherever secrets are stored."
  value       = neon_project.this.connection_uri
  sensitive   = true
}

output "neon_preview_connection_uris" {
  description = "Connection strings for each branch in neon_preview_branches, keyed by branch name."
  value       = { for name, branch in neon_branch.preview : name => branch.connection_uri }
  sensitive   = true
}

output "r2_bucket_name" {
  value = cloudflare_r2_bucket.media.name
}

output "pages_url" {
  description = "Cloudflare Pages default subdomain, once pages_git_repo_owner/name are set. Empty string until then."
  value       = length(cloudflare_pages_project.web) > 0 ? "https://${cloudflare_pages_project.web[0].subdomain}" : ""
}
