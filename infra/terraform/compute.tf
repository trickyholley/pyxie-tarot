# EC2 replaces the DO droplet - same shape (Docker + Caddy via
# docker-compose). Docker install happens here via user_data; the actual
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
#
# This SSH access is for a human, interactively, only - CI deploys go
# through SSM Run Command instead (see github_actions_backend_deploy below
# and aws_iam_role_policy_attachment.backend_ssm), authenticated via IAM/
# OIDC rather than a stored key. That sidesteps an entire class of problem
# hit while this project briefly did use a CI SSH key: a pinned host key
# (to survive instance replacement) and a passphrase-less keypair living in
# a GitHub secret. SSM needs none of that - Canonical's Ubuntu AMI ships
# the SSM Agent pre-installed and it re-registers with Systems Manager
# automatically on every boot, replacement included.
locals {
  rds_app_username = "pyxie_app"

  user_data_script = <<-EOF
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

    # AWS CLI v2 - not in Ubuntu's base AMI/package repos, but
    # infra/fetch-secrets.sh (run on this box by backend.yml's deploy
    # step) shells out to it to read app secrets from Secrets Manager
    # (the DB itself uses IAM auth, see backend/app/database.py - no
    # password to fetch). Auth comes from the instance profile
    # automatically, so no credentials to configure here - just the binary.
    apt-get update -y
    apt-get install -y unzip
    curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o /tmp/awscliv2.zip
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install
    rm -rf /tmp/awscliv2.zip /tmp/aws
  EOF

  # Only functional lines feed user_data_replace_on_change's diff - so doc-only
  # edits to the comments above don't force an EC2 replacement. Keeps the
  # shebang (only non-comment line starting with #).
  user_data = join("\n", [
    for line in split("\n", local.user_data_script) :
    line if line == "#!/bin/bash" || !can(regex("^\\s*#", line))
  ])
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
      # Master password: used only by migrations (env.py), not the app's
      # runtime engine, which still authenticates via the IAM policy below -
      # see migrations/env.py and issue #187.
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

# Lets the backend authenticate to RDS with short-lived IAM tokens
# (generate_db_auth_token in app/database.py) instead of the master
# password - see database.tf's iam_database_authentication_enabled and
# issue #187. Scoped to the specific DB user connecting, not "any user on
# any RDS instance".
resource "aws_iam_role_policy" "backend_rds_iam_auth" {
  name = "rds-iam-auth"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = ["rds-db:connect"]
      Effect = "Allow"
      Resource = [
        "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.main.resource_id}/${local.rds_app_username}"]
    }]
  })
}

# Lets Docker's awslogs logging driver (infra/docker-compose.yml) ship the backend
# container's logs to the log group monitoring.tf creates - no CreateLogGroup permission
# since Terraform owns creating that (so it always has a retention policy set, unlike
# awslogs-create-group's own default of "never expire").
resource "aws_iam_role_policy" "backend_logs" {
  name = "write-backend-logs"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
      Effect   = "Allow"
      Resource = ["${aws_cloudwatch_log_group.backend.arn}:*"]
    }]
  })
}

# Lets the SSM Agent already running on the instance (see user_data comment
# above) register itself and receive commands - the other half of CI's
# keyless deploy path, see github-oidc.tf's github_actions_backend_deploy.
resource "aws_iam_role_policy_attachment" "backend_ssm" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
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

  # No auto-assigned public IP - the Elastic IP below is the instance's
  # only public address. Both count as "a public IPv4 address" for AWS's
  # hourly public-IPv4 billing, so this avoids quietly paying for two.
  associate_public_ip_address = false
  user_data                   = local.user_data

  # user_data changes are NOT ForceNew by default - the AWS provider just
  # stops/starts the instance in place (same disk, same instance ID). But
  # cloud-init only runs user_data on an instance's genuine first boot, so
  # that stop/start would silently NOT re-run the new script - edits to
  # locals.user_data above would sit there unapplied until something else
  # (e.g. an AMI change) forces a real replacement. Setting this to true
  # makes user_data edits actually take effect. Replacement is a non-event
  # now: the Elastic IP re-associates and SSM re-registers on its own,
  # neither needs a human or CI to update anything.
  user_data_replace_on_change = true

  lifecycle {
    # associate_public_ip_address only controls launch-time behavior, but
    # Terraform's post-apply read of it just checks whether the primary
    # ENI currently has *any* public IP - which is true again the moment
    # aws_eip.backend attaches, regardless of how that IP got there.
    # Without this, every future plan sees false drift (true vs the false
    # above) and replaces the instance again - forever. Confirmed via
    # `aws ec2 describe-addresses` that there's genuinely only the one EIP,
    # no double-billed auto-assigned IP; this just stops Terraform from
    # re-litigating a setting that already took effect at creation.
    ignore_changes = [associate_public_ip_address]
  }

  tags = {
    Name = "pyxie-tarot-backend"
  }
}

# Persistent public IP. The instance's own public IP is ephemeral - it'd
# change on every stop/start (including the user_data-edit case above) or
# replacement. dns.tf's api.pyxietarot.live record points at this instead,
# so it never goes stale when the instance underneath changes.
resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name = "pyxie-tarot-backend"
  }
}
