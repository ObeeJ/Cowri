# ── Provider credentials ──────────────────────────────────────────────────────
# All four are read from the environment as TF_VAR_<name> — never put real
# values in a .tfvars file that could end up committed. See infra/README.md.

variable "hetzner_api_token" {
  description = "Hetzner Cloud API token (Hetzner Cloud Console → Security → API Tokens)."
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token, scoped to: Zone:DNS:Edit, Account:Cloudflare Pages:Edit, Account:Workers R2 Storage:Edit."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (Cloudflare dashboard → right sidebar of any domain overview page)."
  type        = string
}

variable "neon_api_key" {
  description = "Neon API key (Neon Console → Account Settings → API Keys)."
  type        = string
  sensitive   = true
}

# ── Naming / environment ──────────────────────────────────────────────────────

variable "project_name" {
  description = "Short name used as a prefix for every resource this config creates."
  type        = string
  default     = "cowri"
}

variable "environment" {
  description = "production, staging, etc — tags resources and namespaces the Neon branch."
  type        = string
  default     = "production"
}

# ── DNS / domain ──────────────────────────────────────────────────────────────

variable "root_domain" {
  description = "The apex domain already onboarded to Cloudflare, e.g. cowri.app."
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain the Rust API is reachable on. Full host is <api_subdomain>.<root_domain>."
  type        = string
  default     = "api"
}

variable "media_subdomain" {
  description = "Subdomain that fronts the R2 media bucket. Full host is <media_subdomain>.<root_domain>."
  type        = string
  default     = "media"
}

# ── Hetzner server ────────────────────────────────────────────────────────────

variable "hetzner_location" {
  description = "Hetzner datacenter. fsn1 (Falkenstein, DE) is the default — no African region exists yet; a European location gives the best latency to Nigeria over the west-African subsea cables."
  type        = string
  default     = "fsn1"
}

variable "hetzner_server_type" {
  description = "Hetzner server type. cpx21 (3 dedicated vCPU / 4GB) is a reasonable start for the Rust API + Redis on one box; resize later by changing this and re-applying."
  type        = string
  default     = "cpx21"
}

variable "ssh_public_key" {
  description = "Public half of the SSH key deploys and admin access use. Generate a dedicated deploy key rather than reusing a personal one."
  type        = string
}

variable "admin_ssh_cidrs" {
  description = "CIDR blocks allowed to reach port 22. Left open (0.0.0.0/0) by default only because no fixed admin IP is known yet — narrow this to your actual IP(s) before applying in a real environment; Hetzner's firewall is stateful so this is the only real perimeter SSH has."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ── Neon ──────────────────────────────────────────────────────────────────────

variable "neon_region_id" {
  description = "Neon compute region. aws-eu-central-1 keeps the database close to the Hetzner fsn1 server (same Frankfurt-area region), which matters more for latency than proximity to end users — every request already goes through the Rust API on the VPS first."
  type        = string
  default     = "aws-eu-central-1"
}

variable "neon_preview_branches" {
  description = "Extra Neon branches to create for preview/dev environments, e.g. [\"dev\"]. Each is a real, independent branch-of-production you can point a staging deploy at without touching prod data."
  type        = list(string)
  default     = ["dev"]
}

# ── R2 / media ────────────────────────────────────────────────────────────────

variable "r2_bucket_name" {
  description = "R2 bucket name for user-uploaded media (avatars, receipts, and — once the feature exists — social post media)."
  type        = string
  default     = "cowri-media"
}

# ── Cloudflare Pages (Next.js) ─────────────────────────────────────────────────

variable "pages_git_repo_owner" {
  description = "GitHub owner/org of the repo Cloudflare Pages should build from. Leave null to skip wiring Pages' git integration until the Next.js app exists (see pages.tf)."
  type        = string
  default     = null
}

variable "pages_git_repo_name" {
  description = "GitHub repo name Cloudflare Pages should build from."
  type        = string
  default     = null
}

variable "pages_production_branch" {
  description = "Branch Cloudflare Pages deploys to production from."
  type        = string
  default     = "master"
}
