// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { BillingInterval, CheckoutSession, CustomerPortalSession } from "@api-client/models";
import { postJson } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/billing`;

export function createCheckoutSession(interval: BillingInterval): Promise<CheckoutSession> {
  return postJson(`${baseUrl}/checkout`, { interval });
}

export function createPortalSession(): Promise<CustomerPortalSession> {
  return postJson(`${baseUrl}/portal`);
}
