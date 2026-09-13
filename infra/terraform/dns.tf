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
  # References the Elastic IP (compute.tf), not the instance directly -
  # the instance's own public IP is ephemeral and would change on a
  # stop/start or replacement; the EIP doesn't.
  records = [aws_eip.backend.public_ip]
}

# Proton Mail custom domain for pyxietarot.live
resource "aws_route53_record" "proton_mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "pyxietarot.live"
  type    = "MX"
  ttl     = 300
  records = [
    "10 mail.protonmail.ch.",
    "20 mailsec.protonmail.ch.",
  ]
}

resource "aws_route53_record" "proton_root_txt" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "pyxietarot.live"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=spf1 include:_spf.protonmail.ch ~all",
    "protonmail-verification=42dcb30aa3571c9c1f64cb29788121845f4d4955",
  ]
}

resource "aws_route53_record" "proton_dkim" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "protonmail._domainkey.pyxietarot.live"
  type    = "CNAME"
  ttl     = 300
  records = ["protonmail.domainkey.dowcp6bz4fpzbhw4uljgtmevycj7szhyncbgdbpa2u4gso4uppriq.domains.proton.ch."]
}

resource "aws_route53_record" "proton_dkim02" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "protonmail2._domainkey.pyxietarot.live"
  type    = "CNAME"
  ttl     = 300
  records = ["protonmail2.domainkey.dowcp6bz4fpzbhw4uljgtmevycj7szhyncbgdbpa2u4gso4uppriq.domains.proton.ch."]
}

resource "aws_route53_record" "proton_dkim03" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "protonmail3._domainkey.pyxietarot.live"
  type    = "CNAME"
  ttl     = 300
  records = ["protonmail3.domainkey.dowcp6bz4fpzbhw4uljgtmevycj7szhyncbgdbpa2u4gso4uppriq.domains.proton.ch."]
}

resource "aws_route53_record" "proton_dmarc" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "_dmarc.pyxietarot.live"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none"]
}

# Resend transactional email (outbound only, separate "send" subdomain per
# Resend's recommended isolation pattern so its SPF/MX don't collide with
# SimpleLogin's root-domain MX above).
resource "aws_route53_record" "resend_dkim" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "resend._domainkey.pyxietarot.live"
  type    = "TXT"
  ttl     = 300
  records = [
    "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCeZOejxgI28EZNFYe6WVzq2SS1fSKUuC+/rxWeH7O9OvQuoUco/q+nnvedmM5PHFMKAOmrnOPdVW9lEpTzpCI8QgwZBwZRZdMPE3Zo/NYMZwolnxojC9P+ZLpswllvpAweRnl51TaKgMA9pzrjcKL9tijIO9GF6YYn1j3SOguW9wIDAQAB"
  ]
}

resource "aws_route53_record" "resend_mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "send.pyxietarot.live"
  type    = "MX"
  ttl     = 300
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "resend_spf" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "send.pyxietarot.live"
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}
