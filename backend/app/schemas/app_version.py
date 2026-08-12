# SPDX-License-Identifier: AGPL-3.0-or-later
from pydantic import BaseModel


class AppVersionRequirements(BaseModel):
    minimum_native_version: str
    recommended_native_version: str
