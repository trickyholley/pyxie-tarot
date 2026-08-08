// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDiaryEntry } from "@pyxie/api-client";
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

interface DeleteDiaryEntryDialogProps {
  entry: AdminDiaryEntry | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteDiaryEntryDialog({
  entry,
  deleting,
  onOpenChange,
  onConfirm,
}: DeleteDiaryEntryDialogProps) {
  const { t } = useTranslation(["diaryEntries", "common"]);
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("deleteDialog.descriptionTemplate", {
              username: entry?.owner_username,
              date: entry && new Date(entry.entry_date).toLocaleDateString(),
            })}
          </DialogDescription>
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
