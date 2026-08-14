#!/bin/bash
# Generates infra/.env from AWS Secrets Manager + RDS, using the EC2
# instance profile's credentials (no explicit AWS creds needed). Re-run on
# every deploy rather than hand-editing .env - see AWS migration plan.md's
# Decisions section for why this replaced the DO droplet's committed/
# hand-written .env.
set -euo pipefail

# Not secret - RDS hostnames aren't sensitive, same as the DO Managed
# Postgres host wasn't treated as one. Hardcoded rather than looked up via
# rds:DescribeDBInstances to avoid needing that extra IAM permission. DB
# username/name are the RDS-config defaults (database.tf), also not secret.
# No DB password here - the backend authenticates with a short-lived IAM
# token instead (app/database.py, issue #187), fetched at connect time
# rather than baked into .env.
RDS_ENDPOINT="pyxie-tarot.c2p4e6ag294o.us-east-1.rds.amazonaws.com"
DB_USER="pyxie"
DB_NAME="pyxie_tarot"
APP_SECRET_KEY_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:pyxie-tarot/secret-key-9pWdBq"
RESEND_KEY_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:pyxie-tarot/resend-key-PpBsy6"
AWS_REGION="us-east-1"

cd "$(dirname "$0")"

SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id "$APP_SECRET_KEY_ARN" --region "$AWS_REGION" --query SecretString --output text)
RESEND_KEY=$(aws secretsmanager get-secret-value --secret-id "$RESEND_KEY_ARN" --region "$AWS_REGION" --query SecretString --output text)

cat > .env <<ENVEOF
DATABASE_USE_IAM_AUTH=true
DATABASE_HOST=${RDS_ENDPOINT}
DATABASE_PORT=5432
DATABASE_USER=${DB_USER}
DATABASE_NAME=${DB_NAME}
AWS_REGION=${AWS_REGION}
SECRET_KEY=${SECRET_KEY}
RESEND_KEY=${RESEND_KEY}
FRONTEND_APP_URL=https://pyxietarot.live
FRONTEND_ADMIN_URL=https://admin.pyxietarot.live
ENVEOF

chmod 600 .env
echo ".env regenerated from Secrets Manager"
