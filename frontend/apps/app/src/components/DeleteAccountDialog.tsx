// SPDX-License-Identifier: AGPL-3.0-or-later
import { Alert, AlertDescription, ConfirmDeleteDialog, Input, Label } from "@pyxie/ui";
import { OctagonXIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteAccountDialogProps {
  open: boolean;
  deleting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => void;
}

/** Destructive confirmation dialog gated on re-entering the account's own password, not just a click. */
export default function DeleteAccountDialog({
  open,
  deleting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation(["settings", "common"]);
  const [password, setPassword] = useState("");

  // Every close (Cancel, backdrop, Escape) routes through this same onOpenChange, so clearing here
  // covers them all - no separate effect needed to react to `open` turning false.
  const handleOpenChange = (next: boolean) => {
    if (!next) setPassword("");
    onOpenChange(next);
  };

  return (
    <ConfirmDeleteDialog
      open={open}
      title={t("profile.delete.dialogTitle")}
      description={t("profile.delete.dialogDescription")}
      cancelLabel={t("common:cancel")}
      confirmLabel={t("profile.delete.confirmButton")}
      deleting={deleting}
      confirmDisabled={!password}
      onOpenChange={handleOpenChange}
      onConfirm={() => onConfirm(password)}
    >
      <div>
        <Label className="mb-2" htmlFor="delete-account-password">
          {t("profile.delete.passwordLabel")}
        </Label>
        <Input
          id="delete-account-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <OctagonXIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </ConfirmDeleteDialog>
  );
}
