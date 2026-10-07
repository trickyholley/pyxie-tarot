// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LicenceSource } from "@pyxie/api-client";
import { useTranslation } from "react-i18next";
import { subscriptionPlatformKey } from "./billingChannel";

export function useSubscriptionPlatform() {
  const { t } = useTranslation("settings");
  return (source: LicenceSource | null) => {
    const key = subscriptionPlatformKey(source);
    return {
      platform: t(`supporter.subscriptionPlatform.${key}.name`),
      cancelFrom: t(`supporter.subscriptionPlatform.${key}.cancelFrom`),
    };
  };
}
