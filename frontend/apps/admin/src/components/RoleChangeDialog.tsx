// SPDX-License-Identifier: AGPL-3.0-or-later
import { Role, User } from "@pyxie/api-client";
import { ConfirmDialog } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface RoleChangeDialogProps {
  pending: { user: User; role: Role } | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function RoleChangeDialog({ pending, saving, onOpenChange, onConfirm }: RoleChangeDialogProps) {
  const { t } = useTranslation(["users", "common"]);
  return (
    <ConfirmDialog
      open={pending !== null}
      title={t("roleChangeDialog.title")}
      description={t("roleChangeDialog.descriptionTemplate", {
        username: pending?.user.username,
        role: pending?.role,
      })}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("common:confirm")}
      pending={saving}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
}
