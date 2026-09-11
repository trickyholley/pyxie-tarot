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
import { ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface SupporterRedirectDialogProps {
  open: boolean;
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  /** Extra bold callout above the usual body - for a case that needs calling out before the usual
   * "you're heading to Gumroad" notice (e.g. buying outright while already mid-subscription). */
  warning?: string;
}

export default function SupporterRedirectDialog({
  open,
  pending,
  onConfirm,
  onOpenChange,
  warning,
}: SupporterRedirectDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("supporter.redirect.title")}</DialogTitle>
          {warning && <p className="font-bold text-destructive">{warning}</p>}
          <DialogDescription>{t("supporter.redirect.body")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            <X data-icon="inline-start" />
            {t("supporter.redirect.cancel")}
          </DialogClose>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {t("supporter.redirect.confirm")}
            <ExternalLink data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
