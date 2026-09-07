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
  TheStarIcon,
} from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import type { BillingOutcome } from "@/lib/billingReturn";

export interface SupporterOutcomeDialogProps {
  outcome: BillingOutcome | null;
  onClose: () => void;
}

/**
 *  Confirms what a trip out to Polar actually did
 */
export default function SupporterOutcomeDialog({ outcome, onClose }: SupporterOutcomeDialogProps) {
  const { t } = useTranslation("settings");
  if (outcome === null) return null;

  const isSubscribed = outcome === "subscribed";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSubscribed && <TheStarIcon className="size-5" />}
            {t(`supporter.outcome.${outcome}.title`)}
          </DialogTitle>
          <DialogDescription>{t(`supporter.outcome.${outcome}.body`)}</DialogDescription>
        </DialogHeader>
        {/* Only the cancel path needs this - it answers "what happens to everything I already made?",
         * which is the question a cancellation actually raises. */}
        {!isSubscribed && <p className="text-sm text-muted-foreground">{t("supporter.outcome.cancelled.keeps")}</p>}
        <DialogFooter>
          <DialogClose render={<Button type="button" />}>{t("supporter.outcome.dismiss")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
