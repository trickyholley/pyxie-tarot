// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LicenceSource } from "@pyxie/api-client";
import { Button } from "@pyxie/ui";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SubscriptionManager, subscriptionManager } from "@/lib/billingChannel";
import { GUMROAD_LIBRARY_URL, gumroadLinkProps } from "@/lib/gumroadUrl";
import { STORE_SUBSCRIPTIONS_URLS } from "@/lib/storeBilling";
import { useSubscriptionPlatform } from "@/lib/useSubscriptionPlatform";

export interface SubscriptionManageActionProps {
  source: LicenceSource | null;
  onNavigate?: () => void;
}

export default function SubscriptionManageAction({ source, onNavigate }: SubscriptionManageActionProps) {
  const { t } = useTranslation("settings");
  const subscriptionPlatform = useSubscriptionPlatform();
  const manager = subscriptionManager(source);
  if (manager === SubscriptionManager.ELSEWHERE) return null;

  const link =
    manager === SubscriptionManager.GUMROAD ? (
      <a {...gumroadLinkProps(GUMROAD_LIBRARY_URL, onNavigate)} />
    ) : (
      <a href={source ? STORE_SUBSCRIPTIONS_URLS[source] : undefined} onClick={onNavigate} />
    );

  return (
    <Button type="button" variant="outline" size="sm" nativeButton={false} render={link}>
      {t("supporter.manage", subscriptionPlatform(source))}
      <ExternalLink data-icon="inline-end" />
    </Button>
  );
}
