// SPDX-License-Identifier: AGPL-3.0-or-later
import { AdminDiaryEntry } from "@pyxie/api-client";
import { ConfirmDeleteDialog } from "@pyxie/ui";
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
    <ConfirmDeleteDialog
      open={entry !== null}
      title={t("deleteDialog.title")}
      description={t("deleteDialog.descriptionTemplate", {
        username: entry?.owner_username,
        date: entry && new Date(entry.entry_date).toLocaleDateString(),
      })}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("common:delete")}
      deleting={deleting}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
