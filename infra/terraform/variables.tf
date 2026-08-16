variable "aws_region" {
  description = "AWS region for all Pyxie Tarot infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "ssh_public_key_path" {
  description = "Local path to the public half of the existing droplet SSH keypair, reused for the EC2 instance."
  type        = string
  default     = "~/.ssh/pyxie.pub"
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the backend. t4g.micro chosen over ECS Fargate on cost - see AWS migration plan.md. Revisit Fargate once there's paying-user traffic to justify an ALB's ~$16/mo fixed cost, which is the only reason EC2 won on price here."
  type        = string
  default     = "t4g.micro"
}

variable "rds_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_master_username" {
  description = "RDS master username."
  type        = string
  default     = "pyxie" // DB_USER in fetch-secrets.sh
}

variable "alert_email" {
  description = "Email address CloudWatch alarms notify via SNS."
  type        = string
  default     = "patrick@holley.dev"
}
