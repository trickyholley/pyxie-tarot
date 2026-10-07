// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LicenceSource } from "@pyxie/api-client";
import { useTranslation } from "react-i18next";
import { subscriptionManager } from "./billingChannel";

export function useSubscriptionPlatform() {
  const { t } = useTranslation("settings");
  return (source: LicenceSource | null) => {
    const manager = subscriptionManager(source);
    return {
      platform: t(`supporter.subscriptionPlatform.${manager}.name`),
      cancelFrom: t(`supporter.subscriptionPlatform.${manager}.cancelFrom`),
    };
  };
}
