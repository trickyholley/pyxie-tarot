// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { CreateSpreadPayload, Spread, UpdateSpreadPayload } from "@api-client/models";
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

export async function createSpread(payload: CreateSpreadPayload): Promise<Spread> {
  const res = await apiFetch(baseUrl, { method: "POST", body: JSON.stringify(payload) });
  return await res.json();
}

export async function updateSpread(spreadId: string, payload: UpdateSpreadPayload): Promise<Spread> {
  const res = await apiFetch(`${baseUrl}/${spreadId}`, { method: "PATCH", body: JSON.stringify(payload) });
  return await res.json();
}

export async function deleteSpread(spreadId: string): Promise<void> {
  await apiFetch(`${baseUrl}/${spreadId}`, { method: "DELETE" });
}
