// SPDX-License-Identifier: AGPL-3.0-or-later
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { BillingInterval, billingAPI, errorMessage, Tier, TierSource } from "@pyxie/api-client";
import { useAuth, useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, CardTitle, toast } from "@pyxie/ui";
import { Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";

/** Opens a Polar-hosted URL (checkout or the customer portal). Native must use the system browser,
 * not the in-app webview - Play Billing must never see this flow (issue #79's Android decision). */
async function openBillingUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.location.href = url;
}

export default function SupporterSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("supporter.title"), backTo: AppRoute.Settings, icon: Star });
  const { user } = useAuth();
  const { withLoading } = useLoading();
  const [pending, setPending] = useState(false);

  const subscribe = async (interval: BillingInterval) => {
    setPending(true);
    try {
      const { url } = await withLoading(billingAPI.createCheckoutSession(interval));
      await openBillingUrl(url);
    } catch (err) {
      toast.error(errorMessage(err, t("supporter.checkoutError")));
    } finally {
      setPending(false);
    }
  };

  const manageSubscription = async () => {
    setPending(true);
    try {
      const { url } = await withLoading(billingAPI.createPortalSession());
      await openBillingUrl(url);
    } catch (err) {
      toast.error(errorMessage(err, t("supporter.portalError")));
    } finally {
      setPending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          <CardTitle>{t("supporter.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("supporter.description")}</p>

          {user.tier === Tier.WORLD && <p className="text-sm">{t("supporter.activeWorld")}</p>}

          {user.tier === Tier.STAR && user.tier_source === TierSource.BILLING && (
            <>
              <p className="text-sm">{t("supporter.activeStar")}</p>
              {user.tier_expires_at && (
                <p className="text-xs text-muted-foreground">
                  {t("supporter.renewsOn", { date: new Date(user.tier_expires_at).toLocaleDateString() })}
                </p>
              )}
              <Button type="button" variant="outline" onClick={manageSubscription} disabled={pending}>
                {t("supporter.manage")}
              </Button>
            </>
          )}

          {user.tier === Tier.FOOL && (
            <>
              <Button type="button" onClick={() => subscribe("monthly")} disabled={pending}>
                {t("supporter.subscribeMonthly")}
              </Button>
              <Button type="button" variant="outline" onClick={() => subscribe("annual")} disabled={pending}>
                {t("supporter.subscribeAnnual")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
