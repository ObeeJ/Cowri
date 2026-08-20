# Cowri infrastructure

Terraform for everything outside the application itself: the Hetzner VPS the
Rust API runs on, the Neon Postgres project, and Cloudflare (DNS, Pages, R2,
CDN/TLS settings). GitHub Actions owns deploying the *application* onto this
infrastructure once it exists — see `.github/workflows/deploy.yml`.

## Layout

| File | Owns |
|---|---|
| `providers.tf` | Provider blocks + version pins |
| `variables.tf` | Every input, with defaults where a sane one exists |
| `hetzner.tf` | The VPS + its SSH key |
| `firewall.tf` | Hetzner Cloud Firewall — SSH restricted, 80/443 restricted to Cloudflare's IPs |
| `cloud-init.yaml` | First-boot server bootstrap (Docker, users, hardening) |
| `neon.tf` | Postgres project + branches |
| `cloudflare.tf` | Zone-level TLS settings |
| `dns.tf` | The `api.<domain>` record |
| `r2.tf` | The media bucket + its custom domain |
| `pages.tf` | Cloudflare Pages project for the Next.js frontend (once it exists) |
| `outputs.tf` | Everything a deploy workflow or a human needs to read back out |

## Before you run this

1. **Credentials, as environment variables — never in a committed file:**

   ```bash
   export TF_VAR_hetzner_api_token="..."
   export TF_VAR_cloudflare_api_token="..."
   export TF_VAR_cloudflare_account_id="..."
   export TF_VAR_neon_api_key="..."
   ```

2. **Required variables with no default** — set these too (env vars or a
   local, gitignored `terraform.tfvars`):

   ```hcl
   root_domain    = "cowri.app"
   ssh_public_key = "ssh-ed25519 AAAA... deploy@cowri"
   ```

   Generate a dedicated deploy key rather than reusing a personal one:
   `ssh-keygen -t ed25519 -f ./cowri-deploy -C deploy@cowri` (keep the
   private half out of git; it goes into GitHub Actions secrets as
   `DEPLOY_SSH_KEY` for `deploy.yml`).

3. **Narrow `admin_ssh_cidrs`** from its `0.0.0.0/0` default to your actual
   IP(s) once you know them — that variable is the only thing standing
   between port 22 and the entire internet otherwise.

## Running it

```bash
cd infra
terraform init
terraform plan   # review before applying anything
terraform apply
```

`registry.terraform.io` needs to be reachable for `init` to download the
three providers — if you're behind a restrictive proxy, that's the first
thing to check.

## After `apply`

- Point your domain's nameservers at Cloudflare if you haven't already —
  Terraform manages records inside the zone, not the zone's delegation.
- Pull the database URL out rather than letting it sit in scrollback:
  `terraform output -raw neon_connection_uri` — put it straight into
  GitHub Actions secrets (`DATABASE_URL`) or wherever `deploy.yml` reads
  secrets from.
- SSH in as `deploy@$(terraform output -raw server_ipv4)` to confirm Docker
  came up: `docker compose version`.
- Set `SMTP_USERNAME` / `SMTP_PASSWORD` / `EMAIL_FROM` (Google SMTP —
  see the backend's own docs) and `PREMBLY_API_KEY` alongside `DATABASE_URL`
  wherever the deploy workflow sources its secrets from — none of that is
  Terraform's concern, but the API won't send mail or verify BVNs without
  them.

## What's intentionally not here yet

- **Cloudflare Pages' git integration** (`pages.tf`) is a no-op until
  `pages_git_repo_owner`/`pages_git_repo_name` are set — there's no Next.js
  app for it to build yet. Set those two variables once the frontend
  migration lands and re-apply; nothing else changes.
- **No remote state backend.** State is local. Fine for one or two people
  applying by hand; the natural upgrade once that stops being true is an
  S3-compatible backend pointed at the R2 bucket this config already
  creates — the commented-out block in `providers.tf` is the starting
  point, once bootstrapped once with local state.
