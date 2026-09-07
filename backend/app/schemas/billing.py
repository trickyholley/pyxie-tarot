# SPDX-License-Identifier: AGPL-3.0-or-later
from typing import Literal

from pydantic import BaseModel

# CLAUDE: The two routes to the World. "monthly" is a Polar subscription walked one arcana at a time;
# "perpetual" is a one-time purchase of the licence that walk arrives at after 21 paid months.
SupportPath = Literal["monthly", "perpetual"]


class CheckoutCreate(BaseModel):
    path: SupportPath


class CheckoutSession(BaseModel):
    url: str


class CustomerPortalSession(BaseModel):
    url: str
