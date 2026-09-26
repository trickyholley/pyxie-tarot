# SPDX-License-Identifier: AGPL-3.0-or-later
from app.core import s3


class FakeS3Client:
    def __init__(self, pages):
        self.pages = pages
        self.deleted_batches = []

    def get_paginator(self, _operation):
        return self

    def paginate(self, **_kwargs):
        return self.pages

    def delete_objects(self, Bucket, Delete):  # noqa: N803 - mirrors boto3's keyword names
        self.deleted_batches.append([obj["Key"] for obj in Delete["Objects"]])
        return {}


def test_delete_prefix_deletes_every_page_and_skips_empty_ones(monkeypatch):
    fake = FakeS3Client(
        [
            {"Contents": [{"Key": "diary/u/a/display.webp"}, {"Key": "diary/u/a/original.webp"}]},
            {"Contents": [{"Key": "diary/u/b/display.webp"}]},
            {},
        ]
    )
    monkeypatch.setattr(s3, "_client", fake)

    s3.delete_prefix("diary/u/")

    assert fake.deleted_batches == [
        ["diary/u/a/display.webp", "diary/u/a/original.webp"],
        ["diary/u/b/display.webp"],
    ]
