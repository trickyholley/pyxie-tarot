// SPDX-License-Identifier: AGPL-3.0-or-later
import { Licence, type SupportPath } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  MAJOR_ARCANA_ICONS,
  TheMagicianIcon,
  TheWorldIcon,
} from "@pyxie/ui";
import { CreditCardCheck, CreditCardPlus, HandHeart, type LucideIcon } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import StoreDisclosure from "@/components/StoreDisclosure";
import SubscriptionManageAction from "@/components/SubscriptionManageAction";
import SupporterRedirectDialog from "@/components/SupporterRedirectDialog";
import SupporterStepHeader from "@/components/SupporterStepHeader";
import SupporterTierCard from "@/components/SupporterTierCard";
import { CheckoutChannel, checkoutChannel, SubscriptionManager, subscriptionManager } from "@/lib/billingChannel";
import { useBillingReturnContext } from "@/lib/BillingReturnContext";
import { buildCheckoutUrl } from "@/lib/gumroadUrl";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import { useReturnTo } from "@/lib/useReturnTo.ts";
import { useStoreBilling } from "@/lib/useStoreBilling";
import { useSubscriptionPlatform } from "@/lib/useSubscriptionPlatform";

export default function SupporterSettings() {
  const { t } = useTranslation("settings");
  const returnTo = useReturnTo(AppRoute.Settings);
  useHeader({ title: t("supporter.title"), backTo: returnTo, icon: HandHeart });
  const { user } = useAuth();
  const [checkoutPath, setCheckoutPath] = useState<SupportPath | null>(null);
  const { beginCheckout } = useBillingReturnContext();
  const channel = checkoutChannel();
  const store = useStoreBilling(channel === CheckoutChannel.STORE);
  const subscriptionPlatform = useSubscriptionPlatform();

  const confirmCheckout = () => {
    if (!user || checkoutPath === null) return;
    beginCheckout(user);
    setCheckoutPath(null);
  };

  if (!user) return null;

  const isPermanentLicence = ([Licence.PERPETUAL, Licence.COMP] as Licence[]).includes(user.licence);
  const isMaxStep = user.arcana_step >= MAJOR_ARCANA_ICONS.length - 1;
  const isComplete = isPermanentLicence || isMaxStep;
  const isSubscribed = user.licence === Licence.SUBSCRIPTION;

  const prices =
    channel === CheckoutChannel.STORE
      ? store.prices
      : {
          monthly: t("supporter.monthly.price"),
          perpetual: t("supporter.perpetual.price"),
          perpetualWas: t("supporter.perpetual.priceWas"),
        };
  const stillSubscribedWarning = isSubscribed
    ? t("supporter.redirect.stillSubscribedWarning", subscriptionPlatform(user.licence_source))
    : undefined;

  const checkoutButton = (path: SupportPath, label: string, Icon: LucideIcon) =>
    channel !== null && (
      <Button
        type="button"
        disabled={channel === CheckoutChannel.STORE && !store.ready}
        onClick={() => (channel === CheckoutChannel.STORE ? void store.purchase(path) : setCheckoutPath(path))}
      >
        {label}
        <Icon data-icon="inline-end" />
      </Button>
    );

  let monthlyFooter;

  const perpetualLabel = isPermanentLicence ? t("supporter.complete") : undefined;

  let monthlyBlurb: ReactNode = t("supporter.monthly.blurb");

  if (isPermanentLicence) {
    monthlyFooter = user.redundant_subscription_sources.map((source) => (
      <Fragment key={source}>
        <p className="text-xs font-bold text-destructive">
          {t("supporter.redundantWarning", subscriptionPlatform(source))}
        </p>
        <SubscriptionManageAction source={source} onNavigate={() => beginCheckout(user)} />
      </Fragment>
    ));
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
    monthlyFooter =
      subscriptionManager(user.licence_source) === SubscriptionManager.ELSEWHERE ? (
        <p className="text-xs text-muted-foreground">
          {t("supporter.managedElsewhere", subscriptionPlatform(user.licence_source))}
        </p>
      ) : (
        <SubscriptionManageAction source={user.licence_source} onNavigate={() => beginCheckout(user)} />
      );
  } else {
    monthlyFooter = checkoutButton("monthly", t("supporter.monthly.subscribe"), CreditCardPlus);
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
      price={prices.monthly}
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
      price={prices.perpetual}
      priceWas={prices.perpetualWas}
      blurb={t("supporter.perpetual.blurb")}
      currentLabel={perpetualLabel}
      footer={
        !isComplete && (
          <>
            {channel === CheckoutChannel.STORE && stillSubscribedWarning && (
              <p className="text-xs font-bold text-destructive">{stillSubscribedWarning}</p>
            )}
            {checkoutButton("perpetual", t("supporter.perpetual.buy"), CreditCardCheck)}
          </>
        )
      }
    />
  );

  return (
    <div className="p-4">
      {channel === CheckoutChannel.GUMROAD && (
        <SupporterRedirectDialog
          open={checkoutPath !== null}
          checkoutUrl={checkoutPath === null ? undefined : buildCheckoutUrl(checkoutPath, user)}
          onConfirm={confirmCheckout}
          onOpenChange={(open) => !open && setCheckoutPath(null)}
          warning={checkoutPath === "perpetual" ? stillSubscribedWarning : undefined}
        />
      )}
      <Card className="w-full">
        <CardHeader>
          <SupporterStepHeader user={user} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-4">
          <div>
            <CardDescription>{isComplete ? t("supporter.achieved.thankYou") : t("supporter.blurb")}</CardDescription>
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
          {channel === CheckoutChannel.STORE && (
            <StoreDisclosure error={store.error} notice={store.notice} onRestore={() => void store.restore()} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
