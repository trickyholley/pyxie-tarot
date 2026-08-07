# Lets GitHub Actions deploy the frontend without any stored AWS
# credentials - it exchanges a short-lived OIDC token for temporary
# creds scoped to exactly this role, only from this repo's main branch.

resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]
}

resource "aws_iam_role" "github_actions_frontend_deploy" {
  name = "pyxie-tarot-frontend-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github_actions.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        # main only - PR branches/forks can't assume this role.
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:trickyholley/pyxie-tarot:ref:refs/heads/main"
        }
      }
    }]
  })
}

# Least-privilege: just what deploy-frontend.sh actually does - write to
# the two frontend buckets, invalidate the two distributions.
resource "aws_iam_role_policy" "github_actions_frontend_deploy" {
  name = "deploy-frontend"
  role = aws_iam_role.github_actions_frontend_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.app_frontend.arn,
          "${aws_s3_bucket.app_frontend.arn}/*",
          aws_s3_bucket.admin_frontend.arn,
          "${aws_s3_bucket.admin_frontend.arn}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = ["cloudfront:CreateInvalidation"]
        Resource = [
          "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.app.id}",
          "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.admin.id}",
        ]
      }
    ]
  })
}
