# SPDX-License-Identifier: AGPL-3.0-or-later
from app.core.app_version import MINIMUM_NATIVE_VERSION, RECOMMENDED_NATIVE_VERSION


async def test_get_app_version_requirements_unauthenticated(client):
    response = await client.get("/api/v1/app-version")

    assert response.status_code == 200
    assert response.json() == {
        "minimum_native_version": MINIMUM_NATIVE_VERSION,
        "recommended_native_version": RECOMMENDED_NATIVE_VERSION,
    }
