# SPDX-License-Identifier: AGPL-3.0-or-later
import pytest

from app.core.app_version import MINIMUM_NATIVE_VERSION, RECOMMENDED_NATIVE_VERSION


@pytest.mark.parametrize("platform", ["android", "ios"])
async def test_get_app_version_requirements_unauthenticated(client, platform):
    response = await client.get("/api/v1/app-version", params={"platform": platform})

    assert response.status_code == 200
    assert response.json() == {
        "minimum_native_version": MINIMUM_NATIVE_VERSION[platform],
        "recommended_native_version": RECOMMENDED_NATIVE_VERSION[platform],
    }


async def test_get_app_version_requirements_rejects_unknown_platform(client):
    response = await client.get("/api/v1/app-version", params={"platform": "windows"})

    assert response.status_code == 422
