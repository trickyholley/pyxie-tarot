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

# Prerendered pages with no file extension (see apps/app/scripts/prerender.mjs) - "/" is excluded
# from this list since it overwrites dist/index.html in place and needs no special handling.
EXTENSIONLESS_ROUTES=(privacy-policy forgot-password reset-password resend-confirmation contact changelog)

aws s3 sync apps/app/dist/ "s3://${APP_BUCKET}/" --delete "${EXTENSIONLESS_ROUTES[@]/#/--exclude=}"
# aws s3 sync can't infer Content-Type for an extensionless file - set it explicitly for each.
for route in "${EXTENSIONLESS_ROUTES[@]}"; do
  aws s3 cp "apps/app/dist/${route}" "s3://${APP_BUCKET}/${route}" --content-type text/html
done
aws s3 sync apps/admin/dist/ "s3://${ADMIN_BUCKET}/" --delete

aws cloudfront create-invalidation --distribution-id "$APP_DISTRIBUTION_ID" --paths "/*"
aws cloudfront create-invalidation --distribution-id "$ADMIN_DISTRIBUTION_ID" --paths "/*"

echo "Deployed. CloudFront invalidations submitted (takes a minute or two to propagate)."
