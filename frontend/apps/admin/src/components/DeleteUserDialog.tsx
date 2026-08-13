// SPDX-License-Identifier: AGPL-3.0-or-later
import { User } from "@pyxie/api-client";
import { ConfirmDeleteDialog } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface DeleteUserDialogProps {
  user: User | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteUserDialog({ user, deleting, onOpenChange, onConfirm }: DeleteUserDialogProps) {
  const { t } = useTranslation(["users", "common"]);
  return (
    <ConfirmDeleteDialog
      open={user !== null}
      title={t("deleteDialog.title")}
      description={t("deleteDialog.descriptionTemplate", { username: user?.username })}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("common:delete")}
      deleting={deleting}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
