// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { PaginatedUsers, Role, User } from "@api-client/models";
import { del, getJson, patchJson } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/users`;

export interface ListUsersFilters {
  search?: string;
  role?: Role;
  createdFrom?: string;
  createdTo?: string;
}

export function listUsers(skip?: number, limit?: number, filters?: ListUsersFilters): Promise<PaginatedUsers> {
  const params = new URLSearchParams({ skip: String(skip ?? 0), limit: String(limit ?? 50) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.role) params.set("role", filters.role);
  if (filters?.createdFrom) params.set("created_from", filters.createdFrom);
  if (filters?.createdTo) params.set("created_to", filters.createdTo);

  return getJson(`${baseUrl}?${params}`);
}

export function getUser(userId: string): Promise<User> {
  return getJson(`${baseUrl}/${userId}`);
}

export function updateUser(userId: string, payload: { username?: string; email?: string }): Promise<User> {
  return patchJson(`${baseUrl}/${userId}`, payload);
}

export function updateUserRole(userId: string, role: Role): Promise<User> {
  return patchJson(`${baseUrl}/${userId}/role?new_role=${role}`);
}

export function deleteUser(userId: string): Promise<void> {
  return del(`${baseUrl}/${userId}`);
}
