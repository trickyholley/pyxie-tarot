// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { User } from "@api-client/models";
import { postJson } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/billing`;

export function syncStoreLicence(): Promise<User> {
  return postJson(`${baseUrl}/revenuecat/sync`);
}
