#!/bin/bash
# Builds and deploys apps/app + apps/admin to S3 + CloudFront. No secrets
# involved (unlike fetch-secrets.sh) - safe to run from anywhere with the
# `pyxie` AWS CLI profile / equivalent credentials.
set -euo pipefail

APP_BUCKET="pyxie-tarot-app-frontend-024253330683"
ADMIN_BUCKET="pyxie-tarot-admin-frontend-024253330683"
APP_DISTRIBUTION_ID="E923JSII1L6S3"
ADMIN_DISTRIBUTION_ID="EMX8JYBJU2BDH"
API_BASE_URL="https://api.pyxietarot.live/api/v1"

cd "$(dirname "$0")/../frontend"

VITE_API_BASE_URL="$API_BASE_URL" pnpm --filter @pyxie/app build
VITE_API_BASE_URL="$API_BASE_URL" pnpm --filter @pyxie/admin build
pnpm --filter @pyxie/app prerender

aws s3 sync apps/app/dist/ "s3://${APP_BUCKET}/" --delete --exclude "privacy-policy"
# aws s3 sync can't infer Content-Type for an extensionless file - set it explicitly.
aws s3 cp apps/app/dist/privacy-policy "s3://${APP_BUCKET}/privacy-policy" --content-type text/html
aws s3 sync apps/admin/dist/ "s3://${ADMIN_BUCKET}/" --delete

aws cloudfront create-invalidation --distribution-id "$APP_DISTRIBUTION_ID" --paths "/*"
aws cloudfront create-invalidation --distribution-id "$ADMIN_DISTRIBUTION_ID" --paths "/*"

echo "Deployed. CloudFront invalidations submitted (takes a minute or two to propagate)."
