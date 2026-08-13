// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import {
  AdminSpread,
  CreateSpreadPayload,
  PaginatedSpreads,
  Spread,
  SpreadType,
  UpdateSpreadPayload,
} from "@api-client/models";
import { del, getJson, patchJson, postJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/spreads`;

export interface ListSpreadsFilters {
  search?: string;
  spreadType?: SpreadType;
  numCards?: number;
  createdFrom?: string;
  createdTo?: string;
}

export function listSpreads(skip?: number, limit?: number, filters?: ListSpreadsFilters): Promise<PaginatedSpreads> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.spreadType) params.set("spread_type", filters.spreadType);
  if (filters?.numCards) params.set("num_cards", String(filters.numCards));
  if (filters?.createdFrom) params.set("created_from", filters.createdFrom);
  if (filters?.createdTo) params.set("created_to", filters.createdTo);

  return getJson(`${baseUrl}?${params}`);
}

export function createSpread(payload: CreateSpreadPayload): Promise<AdminSpread> {
  return postJson(baseUrl, payload);
}

export function updateSpread(spreadId: string, payload: UpdateSpreadPayload): Promise<Spread> {
  return patchJson(`${baseUrl}/${spreadId}`, payload);
}

export function deleteSpread(spreadId: string): Promise<void> {
  return del(`${baseUrl}/${spreadId}`);
}
