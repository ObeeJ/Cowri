resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
  location   = "WEUR" # Western Europe — closest R2 region to fsn1/Nigeria traffic
}

# Puts the bucket on media.<root_domain> with a Cloudflare-managed
# certificate, so uploaded files are served from Cowri's own domain rather
# than an r2.dev URL, and traffic goes through Cloudflare's CDN.
resource "cloudflare_r2_custom_domain" "media" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.media.name
  domain      = "${var.media_subdomain}.${var.root_domain}"
  zone_id     = data.cloudflare_zone.root.id
  enabled     = true
}
