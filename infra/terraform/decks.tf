# decks.pyxietarot.live - deck card art, previously served via Cloudflare
# R2's custom domain feature. Broke when Phase 1 removed the Cloudflare
# .live zone (not accounted for in the original plan - caught by manually
# checking the live app after Phase 2). Same S3+CloudFront+OAC pattern as
# frontend.tf, sharing its ACM cert (decks.pyxietarot.live is a third SAN
# there). URL scheme is unchanged (`https://decks.pyxietarot.live/rider-waite-smith/<slug>.jpg`),
# so no DeckCard.image_url updates needed - just the serving infra moves.

resource "aws_s3_bucket" "decks" {
  bucket = "pyxie-tarot-decks-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "decks" {
  bucket                  = aws_s3_bucket.decks.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_distribution" "decks" {
  enabled         = true
  is_ipv6_enabled = true
  aliases         = ["decks.pyxietarot.live"]
  price_class     = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.decks.bucket_regional_domain_name
    origin_id                = "decks-s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "decks-s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # No custom_error_response here (unlike frontend.tf) - this serves plain
  # image files, not a client-side-routed app, so a missing image should
  # stay a normal 404.

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_s3_bucket_policy" "decks" {
  bucket = aws_s3_bucket.decks.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.decks.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.decks.arn }
      }
    }]
  })
}

resource "aws_route53_record" "decks_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "decks.pyxietarot.live"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.decks.domain_name
    zone_id                = aws_cloudfront_distribution.decks.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "decks_aaaa" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "decks.pyxietarot.live"
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.decks.domain_name
    zone_id                = aws_cloudfront_distribution.decks.hosted_zone_id
    evaluate_target_health = false
  }
}
