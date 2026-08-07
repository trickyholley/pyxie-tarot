#!/bin/bash
# Generates infra/.env from AWS Secrets Manager + RDS, using the EC2
# instance profile's credentials (no explicit AWS creds needed). Re-run on
# every deploy rather than hand-editing .env - see AWS migration plan.md's
# Decisions section for why this replaced the DO droplet's committed/
# hand-written .env.
set -euo pipefail

# Not secret - RDS hostnames aren't sensitive, same as the DO Managed
# Postgres host wasn't treated as one. Hardcoded rather than looked up via
# rds:DescribeDBInstances to avoid needing that extra IAM permission.
RDS_ENDPOINT="pyxie-tarot.c2p4e6ag294o.us-east-1.rds.amazonaws.com"
RDS_MASTER_SECRET_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:rds!db-42b0784e-0ba2-4e3b-83d7-462bfeeeafd9-1ZdQUr"
APP_SECRET_KEY_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:pyxie-tarot/secret-key-9pWdBq"
RESEND_KEY_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:pyxie-tarot/resend-key-PpBsy6"
AWS_REGION="us-east-1"

cd "$(dirname "$0")"

DB_CREDS=$(aws secretsmanager get-secret-value --secret-id "$RDS_MASTER_SECRET_ARN" --region "$AWS_REGION" --query SecretString --output text)
DB_USER=$(echo "$DB_CREDS" | python3 -c "import json,sys; print(json.load(sys.stdin)['username'])")
DB_PASS=$(echo "$DB_CREDS" | python3 -c "import json,sys; print(json.load(sys.stdin)['password'])")
SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id "$APP_SECRET_KEY_ARN" --region "$AWS_REGION" --query SecretString --output text)
RESEND_KEY=$(aws secretsmanager get-secret-value --secret-id "$RESEND_KEY_ARN" --region "$AWS_REGION" --query SecretString --output text)

cat > .env <<ENVEOF
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@${RDS_ENDPOINT}:5432/pyxie_tarot?ssl=require
SECRET_KEY=${SECRET_KEY}
RESEND_KEY=${RESEND_KEY}
FRONTEND_APP_URL=https://pyxietarot.live
FRONTEND_ADMIN_URL=https://admin.pyxietarot.live
ENVEOF

chmod 600 .env
echo ".env regenerated from Secrets Manager"
