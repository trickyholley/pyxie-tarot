# SPDX-License-Identifier: AGPL-3.0-or-later
from fastapi import APIRouter

from app.core.app_version import MINIMUM_NATIVE_VERSION, RECOMMENDED_NATIVE_VERSION, NativePlatform
from app.schemas.app_version import AppVersionRequirements

router = APIRouter(prefix="/app-version", tags=["app-version"])


# Unauthenticated - the native shell must be able to check this before a user has logged in, so it
# can block/nudge the update prompt from the very first screen. `platform` is required (not inferred
# server-side) since only the native shell itself knows which one it is.
@router.get("", response_model=AppVersionRequirements)
async def get_app_version_requirements(platform: NativePlatform) -> AppVersionRequirements:
    return AppVersionRequirements(
        minimum_native_version=MINIMUM_NATIVE_VERSION[platform],
        recommended_native_version=RECOMMENDED_NATIVE_VERSION[platform],
    )
