// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDeck } from "@pyxie/api-client";
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

interface DeleteDeckDialogProps {
  deck: AdminDeck | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteDeckDialog({ deck, deleting, onOpenChange, onConfirm }: DeleteDeckDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  return (
    <Dialog open={deck !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>{t("deleteDialog.descriptionTemplate", { name: deck?.name })}</DialogDescription>
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
