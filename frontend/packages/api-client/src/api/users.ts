// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { ThemeColors, User, UserAuth } from "@api-client/models";
import { apiFetch } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/users`;

export function getMe(): Promise<Response> {
  return apiFetch(`${baseUrl}/me`, { method: "GET" });
}

export function createUser(user: UserAuth): Promise<Response> {
  return apiFetch(baseUrl, {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export async function updateMyTheme(name: string, colors?: ThemeColors | null): Promise<User> {
  const res = await apiFetch(`${baseUrl}/me/theme`, {
    method: "PATCH",
    body: JSON.stringify(colors === undefined ? { name } : { name, colors }),
  });
  return await res.json();
}
