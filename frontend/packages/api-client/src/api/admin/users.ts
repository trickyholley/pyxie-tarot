import {API} from "@api-client/constants";
import {User} from "@api-client/models";
import {apiFetch} from "@api-client/utils.ts";

const baseUrl = `${API.BASE_URL}/admin/users`;

export async function listUsers(skip?: number, limit?: number): Promise<User[]> {
  const res = await apiFetch(`${baseUrl}?skip=${skip}&limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await res.json();
}

export async function getUser(userId: string): Promise<User> {
  const res = await apiFetch(`${baseUrl}?user_id=${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return await res.json();
}
