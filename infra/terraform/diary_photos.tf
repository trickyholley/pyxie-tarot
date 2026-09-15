# Private storage for user-uploaded diary-entry photos (issue #146) - unlike decks.tf's public,
# CloudFront-fronted bucket for CC0 deck art, these are per-user and non-cacheable across viewers, so
# there's nothing for a CDN to buy here. The backend reads/writes directly via its instance role
# (policy below, in compute.tf's aws_iam_role.backend) and serves photos to clients via short-lived
# presigned GET URLs generated per-request - no bucket policy, no custom domain, no CloudFront
# distribution needed at all.

resource "aws_s3_bucket" "diary_photos" {
  bucket = "pyxie-tarot-diary-photos-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "diary_photos" {
  bucket                  = aws_s3_bucket.diary_photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Explicit (unlike decks/frontend buckets, which rely on AWS's default SSE) since this bucket holds
# private user content rather than already-public assets - same reasoning as bootstrap/main.tf's
# tfstate bucket.
resource "aws_s3_bucket_server_side_encryption_configuration" "diary_photos" {
  bucket = aws_s3_bucket.diary_photos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
