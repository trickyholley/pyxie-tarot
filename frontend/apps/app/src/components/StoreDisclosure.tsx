// SPDX-License-Identifier: AGPL-3.0-or-later
import { LicenceSource } from "@pyxie/api-client";
import { Button } from "@pyxie/ui";
import { EyeOff, RotateCcw, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";
import { useSubscriptionPlatform } from "@/lib/useSubscriptionPlatform";

export interface StoreDisclosureProps {
  error: string | null;
  notice: string | null;
  onRestore: () => void;
}

export default function StoreDisclosure({ error, notice, onRestore }: StoreDisclosureProps) {
  const { t } = useTranslation("settings");
  const subscriptionPlatform = useSubscriptionPlatform();

  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
      {error && <p className="font-bold text-destructive">{error}</p>}
      {notice && <p className="font-bold">{notice}</p>}
      <p>
        {t("supporter.store.disclosure", {
          ...subscriptionPlatform(LicenceSource.APP_STORE),
          monthly: t("supporter.monthly.name"),
          perpetual: t("supporter.perpetual.name"),
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onRestore}>
          <RotateCcw data-icon="inline-start" />
          {t("supporter.store.restore")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="underline"
          nativeButton={false}
          render={<Link to={AppRoute.TermsOfService} />}
        >
          <ScrollText data-icon="inline-start" />
          {t("termsOfService")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="underline"
          nativeButton={false}
          render={<Link to={AppRoute.PrivacyPolicy} />}
        >
          <EyeOff data-icon="inline-start" />
          {t("privacyPolicy")}
        </Button>
      </div>
    </div>
  );
}
