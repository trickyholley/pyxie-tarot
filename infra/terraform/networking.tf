# Default VPC - no custom VPC/NAT gateway. EC2 gets a public IP directly
# (same as the DO droplet); RDS sits in the same VPC with no public IP,
# reachable only from the EC2 security group ("trusted sources" equivalent
# to the DO Managed Postgres setup). Avoids a NAT gateway (~$32/mo) that
# nothing here actually needs - RDS has no outbound-internet requirement,
# and EC2 already has its own public IP for outbound.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "backend" {
  name        = "pyxie-tarot-backend"
  description = "Backend EC2 instance - SSH, HTTP, HTTPS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (Caddy ACME challenge + redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "pyxie-tarot-db"
  description = "RDS Postgres - inbound only from the backend instance"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Postgres from the backend security group only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
