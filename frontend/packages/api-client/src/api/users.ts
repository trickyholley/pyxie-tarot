// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { ThemeColors, User, UserAuth } from "@api-client/models";
import { apiFetch, patchJson } from "@api-client/utils";

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

export function updateMyTheme(
  name: string,
  colors?: ThemeColors | null,
  glass?: boolean,
  font?: string | null,
  bold?: boolean,
  fontScale?: number,
): Promise<User> {
  return patchJson(
    `${baseUrl}/me/theme`,
    // Omitted (not sent as undefined/null) when not provided, so the backend's "preserve what's already
    // stored" merge kicks in (see UserThemeUpdate).
    {
      name,
      ...(colors !== undefined && { colors }),
      ...(glass !== undefined && { glass }),
      ...(font !== undefined && { font }),
      ...(bold !== undefined && { bold }),
      ...(fontScale !== undefined && { font_scale: fontScale }),
    },
  );
}

export function updateMyReminder(enabled: boolean, time: string | null, message: string | null): Promise<User> {
  return patchJson(`${baseUrl}/me/reminder`, { enabled, time, message });
}

export function updateMyNotifications(enabled: boolean): Promise<User> {
  return patchJson(`${baseUrl}/me/notifications`, { enabled });
}

export function updateMyEmail(email: string): Promise<User> {
  return patchJson(`${baseUrl}/me/email`, { email });
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
