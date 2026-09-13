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

# RESEND_KEY - unlike SECRET_KEY, this one *is* carried over from the DO
# droplet (a real third-party API key, not something to regenerate) via
# the TF_VAR_resend_key env var at apply time, never written to a file or
# committed. Optional at the app level, but the droplet has a real value
# set, so carrying it over avoids silently degrading password-reset email
# to log-only on cutover.
variable "resend_key" {
  description = "Resend API key, carried over from the DO droplet's .env. Passed via TF_VAR_resend_key, never committed."
  type        = string
  sensitive   = true
}

resource "aws_secretsmanager_secret" "resend_key" {
  name        = "pyxie-tarot/resend-key"
  description = "Resend API key for transactional email - see backend/app/config.py"
}

resource "aws_secretsmanager_secret_version" "resend_key" {
  secret_id     = aws_secretsmanager_secret.resend_key.id
  secret_string = var.resend_key
}

# GUMROAD_WEBHOOK_SECRET - the random token embedded as the last path segment of Gumroad's
# account-wide webhook Ping URL (see backend/app/core/gumroad.py's verify_webhook_payload).
# Generated once, carried over via terraform.tfvars (gitignored, never committed) - same reasoning
# and same file as resend_key above, since this value must match what's set in the Gumroad
# dashboard, not something Terraform should regenerate on a later apply.
variable "gumroad_webhook_secret" {
  description = "Gumroad webhook path secret, matching the Ping URL configured in the Gumroad dashboard. Set in terraform.tfvars, never committed."
  type        = string
  sensitive   = true
}

resource "aws_secretsmanager_secret" "gumroad_webhook_secret" {
  name        = "pyxie-tarot/gumroad-webhook-secret"
  description = "Gumroad webhook path secret - see backend/app/core/gumroad.py"
}

resource "aws_secretsmanager_secret_version" "gumroad_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.gumroad_webhook_secret.id
  secret_string = var.gumroad_webhook_secret
}
