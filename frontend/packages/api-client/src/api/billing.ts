// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { CheckoutSession, SupportPath } from "@api-client/models";
import { postJson } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/billing`;

export function createCheckoutSession(path: SupportPath): Promise<CheckoutSession> {
  return postJson(`${baseUrl}/checkout`, { path });
}
