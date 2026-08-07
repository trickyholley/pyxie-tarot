# RDS replaces DO Managed Postgres (see [[DB hosting plan]] in the vault
# for the original managed-vs-self-hosted reasoning, which still applies).
# Single-AZ, no read replicas - deliberate, tracked as a known shortcut in
# AWS migration plan.md pending real traffic ever justifying Multi-AZ.

resource "aws_db_subnet_group" "main" {
  name       = "pyxie-tarot"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "main" {
  identifier     = "pyxie-tarot"
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.rds_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "pyxie_tarot"
  username = var.rds_master_username
  # Master password is entirely AWS-managed - auto-generated and stored in
  # its own Secrets Manager secret (see outputs.tf for the ARN). Terraform
  # never sees or stores the plaintext password.
  manage_master_user_password = true

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
