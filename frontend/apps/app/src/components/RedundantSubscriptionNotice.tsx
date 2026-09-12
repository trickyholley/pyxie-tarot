// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GUMROAD_LIBRARY_URL, openBillingUrl } from "@/lib/gumroadUrl";

export interface RedundantSubscriptionNoticeProps {
  onDismiss: () => void;
}

/**
 * Nags every app open while the user has full supporter access but Gumroad is still charging them for a subscription
 * that's no longer needed - real money keeps leaving their account for nothing
 */
export default function RedundantSubscriptionNotice({ onDismiss }: RedundantSubscriptionNoticeProps) {
  const { t } = useTranslation("settings");

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("redundantSubscriptionNotice.title")}</DialogTitle>
          <DialogDescription>{t("redundantSubscriptionNotice.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss}>
            {t("redundantSubscriptionNotice.dismiss")}
          </Button>
          <Button type="button" onClick={() => void openBillingUrl(GUMROAD_LIBRARY_URL)}>
            {t("supporter.manageOnGumroad")}
            <ExternalLink data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
