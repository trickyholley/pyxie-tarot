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

# SimpleLogin email alias forwarding for pyxietarot.live.
resource "aws_route53_record" "simplelogin_mx" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "pyxietarot.live"
  type    = "MX"
  ttl     = 300
  records = [
    "10 mx1.simplelogin.co.",
    "20 mx2.simplelogin.co.",
  ]
}

resource "aws_route53_record" "simplelogin_spf" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "pyxietarot.live"
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:simplelogin.co ~all"]
}

resource "aws_route53_record" "simplelogin_dkim" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "dkim._domainkey.pyxietarot.live"
  type    = "CNAME"
  ttl     = 300
  records = ["dkim._domainkey.simplelogin.co."]
}

resource "aws_route53_record" "simplelogin_dkim02" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "dkim02._domainkey.pyxietarot.live"
  type    = "CNAME"
  ttl     = 300
  records = ["dkim02._domainkey.simplelogin.co."]
}

resource "aws_route53_record" "simplelogin_dkim03" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "dkim03._domainkey.pyxietarot.live"
  type    = "CNAME"
  ttl     = 300
  records = ["dkim03._domainkey.simplelogin.co."]
}


# Applies domain-wide, so also governs Resend's outbound mail below - its
# DKIM (resend_dkim) signs as the root domain, which aligns fine under the
# strict adkim=s here. Its SPF won't align under strict aspf=s (Resend's
# SPF/MAIL FROM is on the send. subdomain, not root) - fine since DMARC
# only needs one of DKIM/SPF aligned, but Resend deliverability rests
# entirely on DKIM as a result.
#
# p=none (report-only) for the initial rollout of both providers - switch
# to quarantine/reject once DMARC aggregate reports confirm both are
# authenticating cleanly.
resource "aws_route53_record" "simplelogin_dmarc" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "_dmarc.pyxietarot.live"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none; pct=100; adkim=s; aspf=s"]
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
