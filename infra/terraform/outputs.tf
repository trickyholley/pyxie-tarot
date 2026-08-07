output "route53_nameservers" {
  description = "Set these as the nameservers at the registrar to complete the Cloudflare -> Route 53 cutover."
  value       = aws_route53_zone.primary.name_servers
}

output "backend_public_ip" {
  description = "EC2 instance's public IP - repoint api.pyxietarot.live's A record here in task #5."
  value       = aws_instance.backend.public_ip
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
