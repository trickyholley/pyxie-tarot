// SPDX-License-Identifier: AGPL-3.0-or-later
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
import { CreditCardCheck, CreditCardPlus, ExternalLink, HandHeart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import SupporterRedirectDialog from "@/components/SupporterRedirectDialog";
import SupporterStepHeader from "@/components/SupporterStepHeader";
import SupporterTierCard from "@/components/SupporterTierCard";
import { clearBillingSnapshot } from "@/lib/billingReturn";
import { useBillingReturnContext } from "@/lib/BillingReturnContext";
import { GUMROAD_LIBRARY_URL, openBillingUrl } from "@/lib/gumroadUrl";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";

export default function SupporterSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("supporter.title"), backTo: AppRoute.Settings, icon: HandHeart });
  const { user } = useAuth();
  const { withLoading } = useLoading();
  const [pending, setPending] = useState(false);
  const [checkoutPath, setCheckoutPath] = useState<SupportPath | null>(null);
  const { beginCheckout, setPendingDialogOpen } = useBillingReturnContext();

  // Alert the user that they'll be navigating to Gumroad to reduce confusion
  const confirmRedirect = async () => {
    if (!user || checkoutPath === null) return;
    setPending(true);
    beginCheckout(user);

    try {
      const { url } = await withLoading(billingAPI.createCheckoutSession(checkoutPath));
      setCheckoutPath(null);
      // Opens before the actual handoff below, not after, so it's already up by the time the user's
      // attention leaves the page (a new tab on web, an in-app browser natively).
      setPendingDialogOpen(true);
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

  // No SupporterRedirectDialog confirmation here - the button already names Gumroad, so the heads-up
  // that dialog exists for isn't needed. Still arms the same pending dialog as a purchase, though - a
  // portal-driven change (e.g. cancelling) settles via the same webhook race.
  const manageOnGumroad = () => {
    beginCheckout(user);
    setPendingDialogOpen(true);
    void openBillingUrl(GUMROAD_LIBRARY_URL);
  };

  const manageOnGumroadButton = (
    <Button type="button" variant="outline" size="sm" onClick={manageOnGumroad}>
      {t("supporter.manageOnGumroad")}
      <ExternalLink data-icon="inline-end" />
    </Button>
  );

  let monthlyBlurb: ReactNode = t("supporter.monthly.blurb");

  if (isPermanent) {
    monthlyFooter = user.has_redundant_subscription && (
      <>
        <p className="text-xs font-bold text-destructive">{t("supporter.redundantWarning")}</p>
        {manageOnGumroadButton}
      </>
    );
  } else if (isSubscribed) {
    if (user.licence_expires_at && user.licence_is_active) {
      const dateNote = t(
        user.licence_cancels_at_period_end ? "supporter.monthly.endsOn" : "supporter.monthly.renewsOn",
        { date: new Date(user.licence_expires_at).toLocaleDateString() },
      );
      monthlyBlurb = (
        <>
          {monthlyBlurb} <span className="font-bold">{dateNote}</span>
        </>
      );
    }
    monthlyFooter = manageOnGumroadButton;
  } else {
    monthlyFooter = (
      <Button type="button" onClick={() => setCheckoutPath("monthly")} disabled={pending}>
        {t("supporter.monthly.subscribe")}
        <CreditCardPlus data-icon="inline-end" />
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
      blurb={monthlyBlurb}
      currentLabel={monthlyCurrentLabel}
      currentInactive={isSubscribed && !user.licence_is_active}
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
            <CreditCardCheck data-icon="inline-end" />
          </Button>
        )
      }
    />
  );

  return (
    <div className="p-4">
      <SupporterRedirectDialog
        open={checkoutPath !== null}
        pending={pending}
        onConfirm={confirmRedirect}
        onOpenChange={(open) => !open && setCheckoutPath(null)}
        warning={
          checkoutPath === "perpetual" && isSubscribed ? t("supporter.redirect.stillSubscribedWarning") : undefined
        }
      />
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <SupporterStepHeader user={user} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4">
          <div>
            <CardDescription>{isPermanent ? t("supporter.achieved.thankYou") : t("supporter.blurb")}</CardDescription>
            <ul className="mx-auto flex flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {t("supporter.perks", { returnObjects: true }).map((perk) => (
                <li key={perk} className="list-disc">
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            {isPermanentLicence ? [perpetualCard, monthlyCard] : [monthlyCard, perpetualCard]}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
