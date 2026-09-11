// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useBillingReturnContext } from "@/lib/BillingReturnContext";
import RedundantSubscriptionNotice from "./RedundantSubscriptionNotice";
import SupporterOutcomeDialog from "./SupporterOutcomeDialog";

/**
 * App-wide billing dialogs (issue #79's checkout flow), mounted once in Layout - pending confirmation,
 * the eventual outcome, and the redundant-subscription nag all live here rather than on the Supporter
 * page itself, so they survive navigating away mid-checkout and can be sequenced on purpose: the
 * redundant notice waits for any outcome dialog to clear first, rather than the two racing to stack on
 * top of each other depending on which state update React happens to process first.
 */
export default function BillingNotifications() {
  const { t } = useTranslation("settings");
  const { outcome, dismissOutcome, awaitingWebhook, checkNow, pendingDialogOpen, setPendingDialogOpen } =
    useBillingReturnContext();

  return (
    <>
      <Dialog open={pendingDialogOpen && awaitingWebhook} onOpenChange={setPendingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("supporter.pending.title")}</DialogTitle>
            <DialogDescription>{t("supporter.pending.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("supporter.pending.close")}
            </DialogClose>
            <Button type="button" onClick={checkNow}>
              {t("supporter.checkNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SupporterOutcomeDialog outcome={outcome} onClose={dismissOutcome} />
      {outcome === null && <RedundantSubscriptionNotice />}
    </>
  );
}
