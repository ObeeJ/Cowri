# kislerdm/neon (the provider Neon itself points to for Terraform-managed
# infra). registry.terraform.io isn't reachable from the environment that
# wrote this file, so `terraform init` here is the first real check of the
# resource/attribute names below against the provider's actual schema —
# expect to true them up against the docs on first run.

resource "neon_project" "this" {
  name       = "${var.project_name}-${var.environment}"
  region_id  = var.neon_region_id
  pg_version = 16
}

# One branch per entry in neon_preview_branches — a real, independent
# branch-of-production (schema + data, copy-on-write) rather than a
# separate empty database, so a preview/dev deploy runs against production
# shaped data without touching production itself.
resource "neon_branch" "preview" {
  for_each = toset(var.neon_preview_branches)

  project_id = neon_project.this.id
  parent_id  = neon_project.this.default_branch_id
  name       = each.value
}
