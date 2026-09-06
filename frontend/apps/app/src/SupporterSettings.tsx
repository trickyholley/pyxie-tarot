// SPDX-License-Identifier: AGPL-3.0-or-later
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { type BillingInterval, billingAPI, errorMessage, Tier, TierSource } from "@pyxie/api-client";
import { useAuth, useLoading } from "@pyxie/providers";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  TheFoolIcon,
  TheStarIcon,
  TheWorldIcon,
  toast,
} from "@pyxie/ui";
import { HandHeart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import SupporterIntervalToggle from "@/components/SupporterIntervalToggle";
import SupporterTierCard from "@/components/SupporterTierCard";
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
  useHeader({ title: t("supporter.title"), backTo: AppRoute.Settings, icon: HandHeart });
  const { user } = useAuth();
  const { withLoading } = useLoading();
  const [pending, setPending] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const subscribe = async () => {
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

  const starFeatures = t("supporter.star.features", { returnObjects: true });
  const isFool = user.tier === Tier.FOOL;
  const isStar = user.tier === Tier.STAR;
  const isWorld = user.tier === Tier.WORLD;
  // Only a billing-sourced Star has a real Polar subscription behind it - a comped Star (admin-granted,
  // no checkout ever happened) has nothing for the customer portal to manage.
  const starIsBilled = isStar && user.tier_source === TierSource.BILLING;

  const foolCard = (
    <SupporterTierCard
      key="fool"
      icon={TheFoolIcon}
      name={t("supporter.fool.name")}
      price={t("supporter.fool.price")}
      blurb={t("supporter.fool.blurb")}
      currentLabel={isFool ? t("supporter.currentPlan") : undefined}
      disabled={isWorld}
    />
  );

  const starCard = (
    <SupporterTierCard
      key="star"
      icon={TheStarIcon}
      name={t("supporter.star.name")}
      price={
        isStar ? undefined : t(interval === "monthly" ? "supporter.star.priceMonthly" : "supporter.star.priceAnnual")
      }
      priceNote={isFool && interval === "annual" ? t("supporter.star.annualSavings") : undefined}
      blurb={t("supporter.star.blurb")}
      features={starFeatures}
      currentLabel={isStar ? t("supporter.currentPlan") : undefined}
      disabled={isWorld}
      footer={
        isFool ? (
          <Button type="button" onClick={subscribe} disabled={pending}>
            {t("supporter.star.subscribe")}
          </Button>
        ) : (
          isStar && (
            <>
              <p className="text-xs">{t("supporter.star.active")}</p>
              {user.tier_expires_at && (
                <p className="text-xs text-muted-foreground">
                  {t("supporter.star.renewsOn", { date: new Date(user.tier_expires_at).toLocaleDateString() })}
                </p>
              )}
              {starIsBilled && (
                <Button type="button" variant="outline" size="sm" onClick={manageSubscription} disabled={pending}>
                  {t("supporter.star.manage")}
                </Button>
              )}
            </>
          )
        )
      }
    />
  );

  const worldCard = isWorld && (
    <SupporterTierCard
      key="world"
      icon={TheWorldIcon}
      name={t("supporter.world.name")}
      blurb={t("supporter.world.blurb")}
      features={starFeatures}
      currentLabel={t("supporter.currentPlan")}
    />
  );

  return (
    <div className="p-4">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardDescription>{isWorld ? t("supporter.world.thankYou") : t("supporter.description")}</CardDescription>
        </CardHeader>
        {/* pb-4 overrides Card's has-data-[slot=card-footer]:pb-0 - it targets any descendant with that
         * slot, not just a direct child, so it zeroes this CardContent's own bottom padding too because
         * of the tier cards' CardFooters nested several levels down, clipping the last one. */}
        <CardContent className="pb-4">
          {/* Outside the Star card itself - it applies before subscribing, not to any one tier's box. */}
          {isFool && (
            <div className="mb-3 flex justify-center">
              <SupporterIntervalToggle value={interval} onChange={setInterval} />
            </div>
          )}
          {/* Stacked, World > Star > Fool - highest tier (and the viewer's active one) always first. */}
          <div className="flex flex-col gap-3">
            {worldCard}
            {starCard}
            {foolCard}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
