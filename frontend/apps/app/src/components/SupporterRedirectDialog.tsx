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

export interface SupporterRedirectDialogProps {
  open: boolean;
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

/** CLAUDE: Names Polar before handing the customer over, rather than dropping them onto an unfamiliar
 * site mid-payment. The domain and branding change at the exact moment they're asked for card details,
 * which is the point in the flow where an unexplained jump reads as something being wrong.
 */
export default function SupporterRedirectDialog({
  open,
  pending,
  onConfirm,
  onOpenChange,
}: SupporterRedirectDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("supporter.redirect.title")}</DialogTitle>
          <DialogDescription>{t("supporter.redirect.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("supporter.redirect.cancel")}
          </DialogClose>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {t("supporter.redirect.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
