// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { Spread } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/spreads`;

export async function listSpreads(): Promise<Spread[]> {
  const res = await apiFetch(baseUrl, { method: "GET" });
  return await res.json();
}

export async function getSpread(spreadId: string): Promise<Spread> {
  const res = await apiFetch(`${baseUrl}/${spreadId}`, { method: "GET" });
  return await res.json();
}
