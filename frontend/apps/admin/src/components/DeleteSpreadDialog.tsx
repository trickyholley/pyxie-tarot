// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminSpread } from "@pyxie/api-client";
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
  spread: AdminSpread | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteSpreadDialog({ spread, deleting, onOpenChange, onConfirm }: DeleteSpreadDialogProps) {
  const { t } = useTranslation(["spreads", "common"]);
  return (
    <Dialog open={spread !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>{t("deleteDialog.descriptionTemplate", { name: spread?.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common:cancel")}</DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {t("common:delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
