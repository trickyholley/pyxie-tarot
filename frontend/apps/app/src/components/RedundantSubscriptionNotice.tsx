// SPDX-License-Identifier: AGPL-3.0-or-later
import { useAuth } from "@pyxie/providers";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GUMROAD_LIBRARY_URL, openBillingUrl } from "@/lib/gumroadUrl";

/**
 * Nags every app open while the user has full supporter access but Gumroad is still charging them for a subscription
 * that's no longer needed - real money keeps leaving their account for nothing
 */
export default function RedundantSubscriptionNotice() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user?.has_redundant_subscription || dismissed) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("redundantSubscriptionNotice.title")}</DialogTitle>
          <DialogDescription>{t("redundantSubscriptionNotice.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDismissed(true)}>
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
