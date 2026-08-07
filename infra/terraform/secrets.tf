# App secrets. The DB master credential is a separate, AWS-managed secret
# (see database.tf's manage_master_user_password) - Terraform never sees
# that plaintext password. This one's just the app's own SECRET_KEY (JWT
# signing), which does need to originate somewhere - generated fresh here
# rather than carried over from the DO droplet's .env, since there's no
# public traffic yet to worry about invalidating sessions for.

resource "random_password" "app_secret_key" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "app_secret_key" {
  name        = "pyxie-tarot/secret-key"
  description = "Backend SECRET_KEY (JWT signing) - see backend/app/core/security.py"
}

resource "aws_secretsmanager_secret_version" "app_secret_key" {
  secret_id     = aws_secretsmanager_secret.app_secret_key.id
  secret_string = random_password.app_secret_key.result
}
