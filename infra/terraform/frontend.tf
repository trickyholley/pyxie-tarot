# S3 + CloudFront for apps/app (apex) and apps/admin (subdomain) - green
# field, Cloudflare Pages was planned but never actually built. One ACM
# cert covers both domains (CloudFront requires the cert in us-east-1,
# which is already this project's region). DNS validation goes through
# our own Route 53 zone, so it resolves fast (no registrar involved).

data "aws_caller_identity" "current" {}

resource "aws_acm_certificate" "frontend" {
  domain_name               = "pyxietarot.live"
  subject_alternative_names = ["admin.pyxietarot.live"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.primary.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.value]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "pyxie-tarot-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# --- apps/app -> pyxietarot.live (apex) ---

resource "aws_s3_bucket" "app_frontend" {
  bucket = "pyxie-tarot-app-frontend-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "app_frontend" {
  bucket                  = aws_s3_bucket.app_frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["pyxietarot.live"]
  price_class         = "PriceClass_100" # NA/EU only - cost call, matches the rest of this plan

  origin {
    domain_name              = aws_s3_bucket.app_frontend.bucket_regional_domain_name
    origin_id                = "app-s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "app-s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  # SPA client-side routing (react-router) - any path S3 doesn't have
  # (i.e. anything but the actual built asset files) falls through to
  # index.html so the client-side router can handle it.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

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

resource "aws_s3_bucket_policy" "app_frontend" {
  bucket = aws_s3_bucket.app_frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.app_frontend.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.app.arn }
      }
    }]
  })
}

resource "aws_route53_record" "app_apex_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "pyxietarot.live"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "app_apex_aaaa" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "pyxietarot.live"
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

# --- apps/admin -> admin.pyxietarot.live ---

resource "aws_s3_bucket" "admin_frontend" {
  bucket = "pyxie-tarot-admin-frontend-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "admin_frontend" {
  bucket                  = aws_s3_bucket.admin_frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_distribution" "admin" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["admin.pyxietarot.live"]
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.admin_frontend.bucket_regional_domain_name
    origin_id                = "admin-s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "admin-s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

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

resource "aws_s3_bucket_policy" "admin_frontend" {
  bucket = aws_s3_bucket.admin_frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.admin_frontend.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.admin.arn }
      }
    }]
  })
}

resource "aws_route53_record" "admin_a" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "admin.pyxietarot.live"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.admin.domain_name
    zone_id                = aws_cloudfront_distribution.admin.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "admin_aaaa" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "admin.pyxietarot.live"
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.admin.domain_name
    zone_id                = aws_cloudfront_distribution.admin.hosted_zone_id
    evaluate_target_health = false
  }
}
