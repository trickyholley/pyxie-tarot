// SPDX-License-Identifier: AGPL-3.0-or-later
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { billingAPI, errorMessage, Licence, type SupportPath } from "@pyxie/api-client";
import { useAuth, useLoading } from "@pyxie/providers";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  MAJOR_ARCANA_ICONS,
  TheMagicianIcon,
  TheWorldIcon,
  toast,
} from "@pyxie/ui";
import { HandHeart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import SupporterOutcomeDialog from "@/components/SupporterOutcomeDialog";
import SupporterRedirectDialog from "@/components/SupporterRedirectDialog";
import SupporterStepHeader from "@/components/SupporterStepHeader";
import SupporterTierCard from "@/components/SupporterTierCard";
import { clearBillingSnapshot } from "@/lib/billingReturn";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import { useBillingReturn } from "@/lib/useBillingReturn";

const GUMROAD_LIBRARY_URL = "https://app.gumroad.com/library";

/** Opens a Gumroad URL. Native must use the system browser, not the in-app webview to avoid Google's Play Billing. */
async function openBillingUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function SupporterSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("supporter.title"), backTo: AppRoute.Settings, icon: HandHeart });
  const { user } = useAuth();
  const { withLoading } = useLoading();
  const [pending, setPending] = useState(false);
  const [checkoutPath, setCheckoutPath] = useState<SupportPath | null>(null);
  const { outcome, dismissOutcome, awaitingWebhook, checkNow, beginCheckout } = useBillingReturn();

  // Alert the user that they'll be navigating to Gumroad to reduce confusion
  const confirmRedirect = async () => {
    if (!user || checkoutPath === null) return;
    setPending(true);
    beginCheckout(user);

    try {
      const { url } = await withLoading(billingAPI.createCheckoutSession(checkoutPath));
      setCheckoutPath(null);
      await openBillingUrl(url);
    } catch (err) {
      clearBillingSnapshot();
      toast.error(errorMessage(err, t("supporter.checkoutError")));
    } finally {
      setPending(false);
    }
  };

  if (!user) return null;

  const isPermanentLicence = ([Licence.PERPETUAL, Licence.COMP] as Licence[]).includes(user.licence);
  const isMaxStep = user.arcana_step >= MAJOR_ARCANA_ICONS.length - 1;
  // Can't buy anything if already permanent
  const isPermanent = isPermanentLicence || isMaxStep;
  const isSubscribed = user.licence === Licence.SUBSCRIPTION;

  let monthlyFooter;

  const perpetualLabel = isPermanentLicence ? t("supporter.complete") : undefined;

  const manageOnGumroadButton = (
    <Button type="button" variant="outline" size="sm" onClick={() => openBillingUrl(GUMROAD_LIBRARY_URL)}>
      {t("supporter.manageOnGumroad")}
    </Button>
  );

  if (isPermanent) {
    monthlyFooter = user.has_redundant_subscription && (
      <>
        <p className="text-xs text-muted-foreground">{t("supporter.redundantWarning")}</p>
        {manageOnGumroadButton}
      </>
    );
  } else if (isSubscribed) {
    monthlyFooter = (
      <>
        {user.licence_expires_at && (
          <p className="text-xs text-muted-foreground">
            {t(user.licence_cancels_at_period_end ? "supporter.monthly.endsOn" : "supporter.monthly.renewsOn", {
              date: new Date(user.licence_expires_at).toLocaleDateString(),
            })}
          </p>
        )}
        {manageOnGumroadButton}
      </>
    );
  } else {
    monthlyFooter = (
      <Button type="button" onClick={() => setCheckoutPath("monthly")} disabled={pending}>
        {t("supporter.monthly.subscribe")}
      </Button>
    );
  }

  let monthlyCurrentLabel;
  if (isSubscribed) {
    monthlyCurrentLabel = user.licence_is_active ? t("supporter.monthly.active") : t("supporter.monthly.inactive");
  }

  const monthlyCard = (
    <SupporterTierCard
      key="monthly"
      icon={TheMagicianIcon}
      name={t("supporter.monthly.name")}
      price={t("supporter.monthly.price")}
      blurb={t("supporter.monthly.blurb")}
      currentLabel={monthlyCurrentLabel}
      footer={monthlyFooter}
    />
  );

  const perpetualCard = (
    <SupporterTierCard
      key="perpetual"
      icon={TheWorldIcon}
      name={t("supporter.perpetual.name")}
      price={t("supporter.perpetual.price")}
      priceWas={t("supporter.perpetual.priceWas")}
      blurb={t("supporter.perpetual.blurb")}
      currentLabel={perpetualLabel}
      footer={
        !isPermanent && (
          <Button type="button" onClick={() => setCheckoutPath("perpetual")} disabled={pending}>
            {t("supporter.perpetual.buy")}
          </Button>
        )
      }
    />
  );

  return (
    <div className="p-4">
      <SupporterOutcomeDialog outcome={outcome} onClose={dismissOutcome} />
      <SupporterRedirectDialog
        open={checkoutPath !== null}
        pending={pending}
        onConfirm={confirmRedirect}
        onOpenChange={(open) => !open && setCheckoutPath(null)}
      />
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <SupporterStepHeader user={user} />
          {awaitingWebhook && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
              <span>{t("supporter.pending")}</span>
              <Button type="button" variant="outline" size="sm" onClick={checkNow}>
                {t("supporter.checkNow")}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4">
          <CardDescription className="text-center">
            {isPermanent ? t("supporter.achieved.thankYou") : t("supporter.blurb")}
          </CardDescription>
          <div className="flex flex-col gap-3">
            {isPermanentLicence ? [perpetualCard, monthlyCard] : [monthlyCard, perpetualCard]}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
