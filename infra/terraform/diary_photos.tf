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

# A separate bucket for local backend development against AWS_S3_DIARY_PHOTOS_BUCKET in backend/.env -
# there's otherwise no dev/prod split for this feature, and wiping test uploads out of the *same*
# bucket real users' photos would eventually live in is a mistake waiting to happen. No IAM grant
# needed here (unlike the prod bucket's policy in compute.tf): this is only ever reached from a
# developer's own machine using their real (admin) AWS credentials, never the backend's EC2 role.
resource "aws_s3_bucket" "diary_photos_dev" {
  bucket = "pyxie-tarot-diary-photos-dev-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "diary_photos_dev" {
  bucket                  = aws_s3_bucket.diary_photos_dev.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Self-cleaning: nothing in a dev bucket needs to outlive a short debugging session, so test uploads
# expire on their own instead of relying on remembering to run `make s3-wipe-diary-photos-dev`.
resource "aws_s3_bucket_lifecycle_configuration" "diary_photos_dev" {
  bucket = aws_s3_bucket.diary_photos_dev.id
  rule {
    id     = "expire-after-3-days"
    status = "Enabled"
    filter {}
    expiration {
      days = 3
    }
  }
}
