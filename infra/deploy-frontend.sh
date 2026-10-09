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
GUMROAD_SELLER_SUBDOMAIN="pyxietarot"
GUMROAD_PRODUCT_PERMALINK_MONTHLY="path-month"
GUMROAD_PRODUCT_PERMALINK_PERPETUAL="path-complete"
REVENUECAT_APPLE_API_KEY="appl_tiYrKCtwGGVLUudwLfjkbahsnlA"
# Empty until RevenueCat's Play Store app is set up - Play installs fall back to Gumroad meanwhile.
REVENUECAT_GOOGLE_API_KEY=""

cd "$(dirname "$0")/../frontend"

VITE_API_BASE_URL="$API_BASE_URL" \
  VITE_GUMROAD_SELLER_SUBDOMAIN="$GUMROAD_SELLER_SUBDOMAIN" \
  VITE_GUMROAD_PRODUCT_PERMALINK_MONTHLY="$GUMROAD_PRODUCT_PERMALINK_MONTHLY" \
  VITE_GUMROAD_PRODUCT_PERMALINK_PERPETUAL="$GUMROAD_PRODUCT_PERMALINK_PERPETUAL" \
  VITE_REVENUECAT_APPLE_API_KEY="$REVENUECAT_APPLE_API_KEY" \
  VITE_REVENUECAT_GOOGLE_API_KEY="$REVENUECAT_GOOGLE_API_KEY" \
  pnpm --filter @pyxie/app build
VITE_API_BASE_URL="$API_BASE_URL" pnpm --filter @pyxie/admin build
pnpm --filter @pyxie/app prerender

# Prerendered pages with no file extension (see apps/app/scripts/prerender.mjs) - "/" is excluded
# from this list since it overwrites dist/index.html in place and needs no special handling.
EXTENSIONLESS_ROUTES=(privacy-policy forgot-password reset-password resend-confirmation contact changelog terms-of-service acknowledgements)
# How long superseded hashed assets stay up, so tabs/WebViews still running an older build can keep lazy-loading.
ASSET_RETENTION="7 days ago"

# Hashed assets go up first (immutable, never deleted here) so no live HTML ever points at a missing file,
# then HTML and other unhashed files with no-cache so clients always revalidate them.
deploy_bucket() {
  local dist="$1" bucket="$2"
  shift 2
  aws s3 sync "${dist}/assets/" "s3://${bucket}/assets/" --cache-control "public, max-age=31536000, immutable"
  aws s3 sync "${dist}/" "s3://${bucket}/" --delete --exclude "assets/*" --cache-control "no-cache" "${@/#/--exclude=}"
  for route in "$@"; do
    # aws s3 sync can't infer Content-Type for an extensionless file - set it explicitly for each.
    aws s3 cp "${dist}/${route}" "s3://${bucket}/${route}" --content-type text/html --cache-control "no-cache"
  done
  prune_old_assets "$dist" "$bucket"
}

prune_old_assets() {
  local dist="$1" bucket="$2" cutoff key
  cutoff=$(date -u -d "$ASSET_RETENTION" +%Y-%m-%dT%H:%M:%SZ)
  aws s3api list-objects-v2 --bucket "$bucket" --prefix assets/ \
    --query "Contents[?LastModified<'${cutoff}'].Key" --output text | tr '\t' '\n' |
    while read -r key; do
      if [ -n "$key" ] && [ "$key" != "None" ] && [ ! -e "${dist}/${key}" ]; then
        aws s3 rm "s3://${bucket}/${key}"
      fi
    done
}

deploy_bucket apps/app/dist "$APP_BUCKET" "${EXTENSIONLESS_ROUTES[@]}"
deploy_bucket apps/admin/dist "$ADMIN_BUCKET"

aws cloudfront create-invalidation --distribution-id "$APP_DISTRIBUTION_ID" --paths "/*"
aws cloudfront create-invalidation --distribution-id "$ADMIN_DISTRIBUTION_ID" --paths "/*"

echo "Deployed. CloudFront invalidations submitted (takes a minute or two to propagate)."
