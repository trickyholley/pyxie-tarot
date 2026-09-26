# SPDX-License-Identifier: AGPL-3.0-or-later
import logging

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger("app.s3")

# Constructed once at import, same pattern as database.py's RDS client - cheap, thread-safe, reused
# for every call. No explicit credentials: relies on the backend EC2 instance's IAM role (see
# infra/terraform/diary_photos.tf's aws_iam_role_policy), same as the RDS client.
_client = boto3.client("s3", region_name=settings.AWS_REGION)

# Long enough to cover one diary-entry view without needing to be refreshed mid-session; short
# enough that a leaked URL (e.g. via browser history/logs) doesn't stay valid indefinitely.
PRESIGNED_URL_EXPIRES_SECONDS = 60 * 60


def put_object(key: str, body: bytes, content_type: str) -> None:
    _client.put_object(Bucket=settings.AWS_S3_DIARY_PHOTOS_BUCKET, Key=key, Body=body, ContentType=content_type)


def generate_presigned_get(key: str, expires_in: int = PRESIGNED_URL_EXPIRES_SECONDS) -> str:
    """A time-limited, signed GET URL - lets the private bucket serve one specific object to one
    specific request without the bucket (or any object in it) ever being publicly readable.
    """
    return _client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_DIARY_PHOTOS_BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )


def delete_object(key: str) -> None:
    """Best-effort: a failure here shouldn't block the diary entry's own deletion, which is the
    actually-important operation. Logged so a failure is still visible, not silently lost.

    Catches `BotoCoreError` alongside `ClientError` - a credential-resolution failure (e.g. an IMDS
    hiccup, see diary_entry_shared.py's `_safe_presigned_get`) raises the former, not the latter, and
    callers of this function (delete_entry_and_photos, the photo-upload rollback path) don't expect it
    to raise at all.
    """
    try:
        _client.delete_object(Bucket=settings.AWS_S3_DIARY_PHOTOS_BUCKET, Key=key)
    except (BotoCoreError, ClientError):
        logger.exception("Failed to delete S3 object %s", key)


def delete_prefix(prefix: str) -> None:
    """Deletes every object under `prefix`, e.g. a deleted account's `diary/{user_id}/`. Best-effort,
    like `delete_object` - a failure is logged rather than raised, since the account itself is already gone.
    """
    bucket = settings.AWS_S3_DIARY_PHOTOS_BUCKET
    try:
        for page in _client.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
            objects = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if not objects:
                continue
            response = _client.delete_objects(Bucket=bucket, Delete={"Objects": objects, "Quiet": True})
            for error in response.get("Errors", []):
                logger.error("Failed to delete S3 object %s: %s", error["Key"], error.get("Message"))
    except (BotoCoreError, ClientError):
        logger.exception("Failed to delete S3 prefix %s", prefix)
