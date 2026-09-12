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
import { ActiveBillingDialog } from "@/lib/billingReturn";
import { useBillingReturnContext } from "@/lib/BillingReturnContext";
import RedundantSubscriptionNotice from "./RedundantSubscriptionNotice";
import SupporterOutcomeDialog from "./SupporterOutcomeDialog";

/**
 * App-wide billing dialogs, so navigating from Supporter doesn't silence them
 * The redundant notice alerts on every app open until resolved to nag the user into cancelling
 */
export default function BillingNotifications() {
  const { t } = useTranslation("settings");
  const { activeDialog, outcome, dismissOutcome, dismissPending, checkNow, dismissRedundant } =
    useBillingReturnContext();

  return (
    <>
      <Dialog open={activeDialog === ActiveBillingDialog.PENDING} onOpenChange={(open) => !open && dismissPending()}>
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
      <SupporterOutcomeDialog
        outcome={activeDialog === ActiveBillingDialog.OUTCOME ? outcome : null}
        onClose={dismissOutcome}
      />
      {activeDialog === ActiveBillingDialog.REDUNDANT && <RedundantSubscriptionNotice onDismiss={dismissRedundant} />}
    </>
  );
}
