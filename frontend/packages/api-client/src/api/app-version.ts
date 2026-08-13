// SPDX-License-Identifier: AGPL-3.0-or-later
import { API } from "@api-client/constants";
import { AppVersionRequirements } from "@api-client/models";
import { getJson } from "@api-client/utils";

const baseUrl = `${API.BASE_URL}/app-version`;

export function getAppVersionRequirements(): Promise<AppVersionRequirements> {
  return getJson(baseUrl);
}
