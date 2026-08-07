# Phase 1 (issue #102): DNS off Cloudflare. Recreates the existing record
# set (api.pyxietarot.live -> droplet, DNS-only, no proxying) as-is - the
# apex/admin records get added in Phase 2 once S3+CloudFront exist to point
# them at.

resource "aws_route53_zone" "primary" {
  name = "pyxietarot.live"
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "api.pyxietarot.live"
  type    = "A"
  ttl     = 300
  records = [var.backend_ip]
}
