// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { CreateSpreadPayload, Spread, UpdateSpreadPayload } from "@api-client/models";
import { del, getJson, patchJson, postJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/spreads`;

export function listSpreads(): Promise<Spread[]> {
  return getJson(baseUrl);
}

export function getSpread(spreadId: string): Promise<Spread> {
  return getJson(`${baseUrl}/${spreadId}`);
}

export function createSpread(payload: CreateSpreadPayload): Promise<Spread> {
  return postJson(baseUrl, payload);
}

export function updateSpread(spreadId: string, payload: UpdateSpreadPayload): Promise<Spread> {
  return patchJson(`${baseUrl}/${spreadId}`, payload);
}

export function deleteSpread(spreadId: string): Promise<void> {
  return del(`${baseUrl}/${spreadId}`);
}
