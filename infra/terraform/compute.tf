# EC2 replaces the DO droplet - same shape (Docker + Caddy via
# docker-compose, reused SSH keypair, "deploy" user matching the existing
# `ssh pyxie` config/Deploy runbook so those keep working unchanged after
# cutover). Docker install happens here via user_data; the actual
# docker-compose.yml deploy is a separate step (task #5).

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "deploy" {
  key_name   = "pyxie-tarot-deploy"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# Ubuntu's cloud-init already gives the default "ubuntu" user key-only SSH
# + passwordless sudo; user_data adds a "deploy" user on top so the
# existing `ssh pyxie` config (User deploy) and Deploy runbook keep
# working unchanged - just repoint the Host's IP after cutover.
# Note: passwordless sudo here (unlike the DO droplet's password-required
# sudo) - SSH access is already the real security boundary (key-only), and
# managing a separate local sudo password would add a secret to track for
# no real security gain.
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail

    useradd -m -s /bin/bash -G sudo deploy
    mkdir -p /home/deploy/.ssh
    cp /home/ubuntu/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

    curl -fsSL https://get.docker.com | sh
    usermod -aG docker deploy
  EOF
}

resource "aws_iam_role" "backend" {
  name = "pyxie-tarot-backend"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# Least-privilege: read access to exactly the secrets the backend needs,
# nothing broader.
resource "aws_iam_role_policy" "backend_secrets" {
  name = "read-app-secrets"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = ["secretsmanager:GetSecretValue"]
      Effect = "Allow"
      Resource = [
        aws_db_instance.main.master_user_secret[0].secret_arn,
        aws_secretsmanager_secret.app_secret_key.arn,
        aws_secretsmanager_secret.resend_key.arn,
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "backend" {
  name = "pyxie-tarot-backend"
  role = aws_iam_role.backend.name
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  key_name               = aws_key_pair.deploy.key_name
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.backend.name

  associate_public_ip_address = true
  user_data                   = local.user_data

  tags = {
    Name = "pyxie-tarot-backend"
  }
}
