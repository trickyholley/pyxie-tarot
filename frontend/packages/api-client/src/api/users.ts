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

export async function updateMyTheme(name: string, colors?: ThemeColors | null, frosted?: boolean): Promise<User> {
  const res = await apiFetch(`${baseUrl}/me/theme`, {
    method: "PATCH",
    // colors/frosted are omitted (rather than sent as undefined/null) when not provided, so the
    // backend's "preserve whatever's already stored" merge kicks in - see UserThemeUpdate.
    body: JSON.stringify({ name, ...(colors !== undefined && { colors }), ...(frosted !== undefined && { frosted }) }),
  });
  return await res.json();
}
