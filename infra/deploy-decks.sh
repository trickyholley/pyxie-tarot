#!/bin/bash
# Sets Cache-Control on the deck-image objects already sitting in the decks
# bucket. Unlike deploy-frontend.sh, there's no local build output to sync
# from - card art was uploaded once by hand (see decks.tf) and was never
# checked into this repo, so this rewrites metadata on the existing S3
# objects in place (--metadata-directive REPLACE copies each object onto
# itself, no re-upload of image bytes needed) rather than pushing new files.
#
# Run once to backfill headers on the current objects. Re-run any time deck
# art actually changes on disk, immediately followed by the invalidation
# below - `immutable` is only honest if a change is never left half-rolled-out
# to CloudFront's edge caches.
set -euo pipefail

DECKS_BUCKET="pyxie-tarot-decks-024253330683"

aws s3 cp "s3://${DECKS_BUCKET}/" "s3://${DECKS_BUCKET}/" \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "image/jpeg"

DECKS_DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items, 'decks.pyxietarot.live')].Id | [0]" \
  --output text)

aws cloudfront create-invalidation --distribution-id "$DECKS_DISTRIBUTION_ID" --paths "/*"

echo "Deck image headers updated. CloudFront invalidation submitted (takes a minute or two to propagate)."
