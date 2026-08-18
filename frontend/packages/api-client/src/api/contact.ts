// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { postVoid } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/contact`;

export function sendContactMessage(message: string): Promise<void> {
  return postVoid(baseUrl, { message });
}
