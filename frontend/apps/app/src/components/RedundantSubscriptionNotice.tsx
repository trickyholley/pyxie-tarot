// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LicenceSource } from "@pyxie/api-client";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscriptionPlatform } from "@/lib/useSubscriptionPlatform";
import SubscriptionManageAction from "./SubscriptionManageAction";

export interface RedundantSubscriptionNoticeProps {
  sources: LicenceSource[];
  onDismiss: () => void;
}

/**
 * Nags every app open while the user has full supporter access but is still being charged for a subscription
 * that's no longer needed - real money keeps leaving their account for nothing
 */
export default function RedundantSubscriptionNotice({ sources, onDismiss }: RedundantSubscriptionNoticeProps) {
  const { t } = useTranslation("settings");
  const subscriptionPlatform = useSubscriptionPlatform();

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("redundantSubscriptionNotice.title")}</DialogTitle>
          {sources.map((source) => (
            <DialogDescription key={source}>
              {t("supporter.redundantWarning", subscriptionPlatform(source))}
            </DialogDescription>
          ))}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss}>
            <X data-icon="inline-start" />
            {t("redundantSubscriptionNotice.dismiss")}
          </Button>
          {sources.map((source) => (
            <SubscriptionManageAction key={source} source={source} />
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
