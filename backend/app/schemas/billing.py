# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Literal

from pydantic import BaseModel

# "monthly" walks the journey one arcana a month; "perpetual" buys the licence it ends in outright.
SupportPath = Literal["monthly", "perpetual"]


class CheckoutCreate(BaseModel):
    path: SupportPath


class CheckoutSession(BaseModel):
    url: str
