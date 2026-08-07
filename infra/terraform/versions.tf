terraform {
  required_version = ">= 1.15"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bucket created by ./bootstrap. Backend blocks can't reference variables,
  # so this is hardcoded - matches bootstrap's `pyxie-tarot-tfstate-<account-id>`
  # naming. use_lockfile uses Terraform's native S3 state locking (1.10+),
  # no DynamoDB table needed.
  backend "s3" {
    bucket       = "pyxie-tarot-tfstate-024253330683"
    key          = "pyxie-tarot/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
