# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Literal

from pydantic import BaseModel

BillingInterval = Literal["monthly", "annual"]


class CheckoutCreate(BaseModel):
    interval: BillingInterval


class CheckoutSession(BaseModel):
    url: str


class CustomerPortalSession(BaseModel):
    url: str
