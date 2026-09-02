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
# Migrations connect via master password (DATABASE_URL) rather than IAM -
# see migrations/env.py - since the migration that grants IAM login
# (7d5d4f21fc76) can't itself run over a connection that requires that
# grant to already exist. The app's runtime engine still uses the IAM
# token path (app/database.py, issue #187).
RDS_ENDPOINT="pyxie-tarot.c2p4e6ag294o.us-east-1.rds.amazonaws.com"
RDS_MASTER_SECRET_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:rds!db-42b0784e-0ba2-4e3b-83d7-462bfeeeafd9-1ZdQUr"
DB_USER="pyxie" # rds_master_username default in variables.tf
DB_APP_USER="pyxie_app"
DB_NAME="pyxie_tarot"
APP_SECRET_KEY_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:pyxie-tarot/secret-key-9pWdBq"
RESEND_KEY_ARN="arn:aws:secretsmanager:us-east-1:024253330683:secret:pyxie-tarot/resend-key-PpBsy6"
AWS_REGION="us-east-1"

cd "$(dirname "$0")"

# Percent-encoded before it reaches .env. docker-compose.yml pulls this
# file in via env_file, and Compose interpolates $VAR / ${VAR} in those
# values - so a '$' in a rotated password gets eaten along with the
# identifier characters after it, silently handing the container a
# shorter password than the one in .env. That is the 2026-09-01 outage:
# a 28-character password arrived at asyncpg as 12 characters and
# migrations failed with InvalidPasswordError while .env looked correct.
# Encoding turns '$' into %24, which Compose leaves alone and SQLAlchemy
# unquotes back on the way in. safe='' matters: the default leaves '/'
# unescaped, which would break the path segment. Only correct while
# DATABASE_URL is the sole consumer - a raw-password use site (psql,
# etc.) would need the unencoded value.
DB_PASS=$(aws secretsmanager get-secret-value --secret-id "$RDS_MASTER_SECRET_ARN" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys,urllib.parse; print(urllib.parse.quote(json.load(sys.stdin)['password'], safe=''))")
SECRET_KEY=$(aws secretsmanager get-secret-value --secret-id "$APP_SECRET_KEY_ARN" --region "$AWS_REGION" --query SecretString --output text)
RESEND_KEY=$(aws secretsmanager get-secret-value --secret-id "$RESEND_KEY_ARN" --region "$AWS_REGION" --query SecretString --output text)

cat > .env <<ENVEOF
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@${RDS_ENDPOINT}:5432/${DB_NAME}?ssl=require
DATABASE_USE_IAM_AUTH=true
DATABASE_HOST=${RDS_ENDPOINT}
DATABASE_PORT=5432
DATABASE_APP_USER=${DB_APP_USER}
DATABASE_NAME=${DB_NAME}
AWS_REGION=${AWS_REGION}
SECRET_KEY=${SECRET_KEY}
RESEND_KEY=${RESEND_KEY}
FRONTEND_APP_URL=https://pyxietarot.live
FRONTEND_ADMIN_URL=https://admin.pyxietarot.live
REDIS_URL=redis://redis:6379/0
ENVEOF

chmod 600 .env
echo ".env regenerated from Secrets Manager"
