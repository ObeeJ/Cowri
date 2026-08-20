terraform {
  required_version = ">= 1.6"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.48"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.44"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.9"
    }
  }

  # State is local by default, deliberately — this is a two-person bootstrap,
  # not a team with a shared state backend to operate. If/when that changes,
  # the natural upgrade is an S3-compatible backend pointed at the R2 bucket
  # this config already creates (see r2.tf), configured here once it exists:
  #
  # backend "s3" {
  #   bucket                      = "cowri-terraform-state"
  #   key                         = "cowri.tfstate"
  #   region                      = "auto"
  #   endpoints                   = { s3 = "https://<account_id>.r2.cloudflarestorage.com" }
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  # }
}

provider "hcloud" {
  token = var.hetzner_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "neon" {
  api_key = var.neon_api_key
}
