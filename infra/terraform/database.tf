# RDS replaces DO Managed Postgres (see [[DB hosting plan]] in the vault
# for the original managed-vs-self-hosted reasoning, which still applies).
# Single-AZ, no read replicas - deliberate, tracked as a known shortcut in
# AWS migration plan.md pending real traffic ever justifying Multi-AZ.

resource "aws_db_subnet_group" "main" {
  name       = "pyxie-tarot"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "main" {
  identifier = "pyxie-tarot"
  engine     = "postgres"
  # Must match the DO Managed Postgres source version (18) for pg_dump/
  # restore compatibility - discovered it had drifted from the "16/17"
  # assumption in the original DB hosting plan note. allow_major_version_upgrade
  # is only here to let this specific 17->18 correction apply in place;
  # the instance was empty (no data restored yet) when this changed.
  engine_version              = "18"
  allow_major_version_upgrade = true
  instance_class              = var.rds_instance_class
  # Without this, RDS defers modifications (like the engine_version bump
  # above) to the next maintenance window instead of applying them now -
  # bit us once already (state said "18", live instance stayed on 17.9
  # until this was set). Fine to leave on permanently: no live traffic to
  # protect from a maintenance-window disruption right now.
  apply_immediately = true

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "pyxie_tarot"
  username = var.rds_master_username
  # Master password is entirely AWS-managed - auto-generated and stored in
  # its own Secrets Manager secret (see outputs.tf for the ARN). Terraform
  # never sees or stores the plaintext password.
  manage_master_user_password = true
  # The backend connects via short-lived IAM auth tokens instead of that
  # password (see compute.tf's rds-db:connect policy and
  # backend/app/database.py) - see issue #187 for why. The managed
  # password above still exists as a break-glass fallback (e.g. manual
  # psql access), just isn't what the app uses day to day.
  iam_database_authentication_enabled = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  multi_az                   = false
  backup_retention_period    = 7
  auto_minor_version_upgrade = true

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "pyxie-tarot-final"

  lifecycle {
    prevent_destroy = true
  }
}
