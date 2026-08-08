// SPDX-License-Identifier: AGPL-3.0-or-later
import { Role, User } from "@pyxie/api-client";
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

interface RoleChangeDialogProps {
  pending: { user: User; role: Role } | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function RoleChangeDialog({ pending, saving, onOpenChange, onConfirm }: RoleChangeDialogProps) {
  const { t } = useTranslation(["users", "common"]);
  return (
    <Dialog open={pending !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roleChangeDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("roleChangeDialog.descriptionTemplate", { username: pending?.user.username, role: pending?.role })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t("common:cancel")}</DialogClose>
          <Button onClick={onConfirm} disabled={saving}>
            {t("roleChangeDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
