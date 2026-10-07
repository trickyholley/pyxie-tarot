// SPDX-License-Identifier: AGPL-3.0-or-later
import { LicenceSource, type SupportPath } from "@pyxie/api-client";
import { useAuth, useLoading } from "@pyxie/providers";
import { MAJOR_ARCANA_ICONS } from "@pyxie/ui";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBillingReturnContext } from "./BillingReturnContext";
import { getStorePackages, identifyStoreUser, purchaseStorePackage, restoreStorePurchases } from "./storeBilling";
import { useAsyncData } from "./useAsyncData";
import { useSubscriptionPlatform } from "./useSubscriptionPlatform";

const JOURNEY_MONTHS = MAJOR_ARCANA_ICONS.length - 1;

export function useStoreBilling(enabled: boolean) {
  const { t } = useTranslation("settings");
  const { withLoading } = useLoading();
  const { user, refreshUser } = useAuth();
  const { awaitPurchase } = useBillingReturnContext();
  const [actionFailed, setActionFailed] = useState(false);
  const [restored, setRestored] = useState<boolean | null>(null);
  const errorMessage = t("supporter.store.error", useSubscriptionPlatform()(LicenceSource.APP_STORE));
  const fetchPackages = useCallback(() => (enabled ? getStorePackages() : undefined), [enabled]);
  const { data: packages, error: loadError } = useAsyncData(fetchPackages, errorMessage);

  const run = async (action: () => Promise<void>) => {
    setActionFailed(false);
    setRestored(null);
    try {
      await withLoading(action());
    } catch {
      setActionFailed(true);
    }
  };

  const purchase = (path: SupportPath) =>
    run(async () => {
      if (!user || !packages) return;
      await identifyStoreUser(user.id);
      if (await purchaseStorePackage(packages[path])) awaitPurchase(user);
    });

  const restore = () =>
    run(async () => {
      if (!user) return;
      await identifyStoreUser(user.id);
      setRestored(await restoreStorePurchases());
      await refreshUser();
    });

  const monthly = packages?.monthly.product;
  const prices = {
    monthly: monthly && t("supporter.monthly.storePrice", { price: monthly.priceString }),
    perpetual: packages?.perpetual.product.priceString,
    perpetualWas:
      monthly &&
      new Intl.NumberFormat(undefined, { style: "currency", currency: monthly.currencyCode }).format(
        monthly.price * JOURNEY_MONTHS,
      ),
  };

  return {
    ready: packages !== null,
    prices,
    error: loadError ?? (actionFailed ? errorMessage : null),
    notice: restored === null ? null : t(restored ? "supporter.store.restored" : "supporter.store.nothingToRestore"),
    purchase,
    restore,
  };
}
