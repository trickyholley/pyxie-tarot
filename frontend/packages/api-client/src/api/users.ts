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

export async function updateMyTheme(name: string, colors?: ThemeColors | null, glass?: boolean): Promise<User> {
  const res = await apiFetch(`${baseUrl}/me/theme`, {
    method: "PATCH",
    // Omitted (not sent as undefined/null) when not provided, so the backend's "preserve what's
    // already stored" merge kicks in (see UserThemeUpdate).
    body: JSON.stringify({ name, ...(colors !== undefined && { colors }), ...(glass !== undefined && { glass }) }),
  });
  return await res.json();
}

export async function updateMyReminder(enabled: boolean, time: string | null): Promise<User> {
  const res = await apiFetch(`${baseUrl}/me/reminder`, {
    method: "PATCH",
    body: JSON.stringify({ enabled, time }),
  });
  return await res.json();
}

export async function updateMyNotifications(enabled: boolean): Promise<User> {
  const res = await apiFetch(`${baseUrl}/me/notifications`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
  return await res.json();
}

export async function updateMyEmail(email: string): Promise<User> {
  const res = await apiFetch(`${baseUrl}/me/email`, {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
  return await res.json();
}

export function updateMyPassword(currentPassword: string, newPassword: string): Promise<Response> {
  return apiFetch(`${baseUrl}/me/password`, {
    method: "PATCH",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function deleteMe(password: string): Promise<Response> {
  return apiFetch(`${baseUrl}/me`, {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}
