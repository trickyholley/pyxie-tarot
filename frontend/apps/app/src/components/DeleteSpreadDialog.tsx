// SPDX-License-Identifier: AGPL-3.0-or-later
import { Spread } from "@pyxie/api-client";
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

interface DeleteSpreadDialogProps {
  spread: Spread | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteSpreadDialog({ spread, deleting, onOpenChange, onConfirm }: DeleteSpreadDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <Dialog open={spread !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("spreads.list.deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("spreads.list.deleteDialog.descriptionTemplate", { name: spread?.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("spreads.list.deleteDialog.cancel")}
          </DialogClose>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={deleting}>
            {t("spreads.list.deleteDialog.confirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
