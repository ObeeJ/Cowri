# Conditional on pages_git_repo_owner/name being set — left unset until the
# Next.js app (infra/README.md, "Next.js + Bun migration") actually exists,
# since there is nothing for Cloudflare to build yet. Once it does, set
# those two variables and re-apply; no other change is needed here.
resource "cloudflare_pages_project" "web" {
  count = var.pages_git_repo_owner != null && var.pages_git_repo_name != null ? 1 : 0

  account_id        = var.cloudflare_account_id
  name              = "${var.project_name}-${var.environment}"
  production_branch = var.pages_production_branch

  source {
    type = "github"
    config {
      owner               = var.pages_git_repo_owner
      repo_name           = var.pages_git_repo_name
      production_branch   = var.pages_production_branch
      pr_comments_enabled = true
    }
  }

  build_config {
    build_command   = "cd web && bun run build"
    destination_dir = "web/out" # Next.js `output: "export"` writes here
    root_dir        = "/"
  }

  deployment_configs {
    production {
      environment_variables = {
        NEXT_PUBLIC_COWRI_API_URL = "https://${var.api_subdomain}.${var.root_domain}"
      }
    }
  }
}

resource "cloudflare_record" "pages_custom_domain" {
  count = length(cloudflare_pages_project.web) > 0 ? 1 : 0

  zone_id = data.cloudflare_zone.root.id
  name    = "@"
  type    = "CNAME"
  content = cloudflare_pages_project.web[0].subdomain
  proxied = true
  ttl     = 1
}
