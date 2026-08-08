output "route53_nameservers" {
  description = "Set these as the nameservers at the registrar to complete the Cloudflare -> Route 53 cutover."
  value       = aws_route53_zone.primary.name_servers
}

output "backend_public_ip" {
  description = "Backend's Elastic IP - for the ssh pyxie alias / manual debugging. CI no longer needs this: deploys go through SSM Run Command, not SSH."
  value       = aws_eip.backend.public_ip
}

output "rds_endpoint" {
  description = "RDS connection endpoint (host:port), for building DATABASE_URL in task #5."
  value       = aws_db_instance.main.endpoint
}

output "rds_master_secret_arn" {
  description = "Secrets Manager ARN holding the AWS-managed RDS master username/password JSON."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "app_secret_key_arn" {
  description = "Secrets Manager ARN holding the backend's SECRET_KEY."
  value       = aws_secretsmanager_secret.app_secret_key.arn
}

output "resend_key_arn" {
  description = "Secrets Manager ARN holding the Resend API key."
  value       = aws_secretsmanager_secret.resend_key.arn
}

output "app_frontend_bucket" {
  description = "S3 bucket for apps/app's build output."
  value       = aws_s3_bucket.app_frontend.id
}

output "admin_frontend_bucket" {
  description = "S3 bucket for apps/admin's build output."
  value       = aws_s3_bucket.admin_frontend.id
}

output "app_cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "admin_cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.admin.id
}

output "decks_bucket" {
  description = "S3 bucket for deck card images."
  value       = aws_s3_bucket.decks.id
}

output "github_actions_frontend_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN repo variable in GitHub Actions."
  value       = aws_iam_role.github_actions_frontend_deploy.arn
}

output "github_actions_backend_deploy_role_arn" {
  description = "Set as the AWS_BACKEND_DEPLOY_ROLE_ARN repo variable in GitHub Actions."
  value       = aws_iam_role.github_actions_backend_deploy.arn
}
