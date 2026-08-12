// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { AppVersionRequirements } from "@api-client/models";
import { apiFetch } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/app-version`;

export async function getAppVersionRequirements(): Promise<AppVersionRequirements> {
  const res = await apiFetch(baseUrl, { method: "GET" });
  return await res.json();
}
