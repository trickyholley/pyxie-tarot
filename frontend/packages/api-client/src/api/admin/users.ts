import { API } from "@api-client/constants";
import { PaginatedUsers, Role, User } from "@api-client/models";
import { apiFetch } from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/users`;

export async function listUsers(skip?: number, limit?: number): Promise<PaginatedUsers> {
  const res = await apiFetch(`${baseUrl}?skip=${skip ?? 0}&limit=${limit ?? 50}`, {
    method: "GET",
  });

  return await res.json();
}

export async function getUser(userId: string): Promise<User> {
  const res = await apiFetch(`${baseUrl}/${userId}`, {
    method: "GET",
  });

  return await res.json();
}

export async function updateUser(userId: string, payload: { username?: string; email?: string }): Promise<User> {
  const res = await apiFetch(`${baseUrl}/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return await res.json();
}

export async function updateUserRole(userId: string, role: Role): Promise<User> {
  const res = await apiFetch(`${baseUrl}/${userId}/role?new_role=${role}`, {
    method: "PATCH",
  });

  return await res.json();
}

export async function deleteUser(userId: string): Promise<void> {
  await apiFetch(`${baseUrl}/${userId}`, {
    method: "DELETE",
  });
}
