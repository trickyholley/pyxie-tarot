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
  Input,
  Label,
} from "@pyxie/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteAccountDialogProps {
  open: boolean;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => void;
}

/** Destructive confirmation dialog gated on re-entering the account's own password, not just a click. */
export default function DeleteAccountDialog({ open, deleting, onOpenChange, onConfirm }: DeleteAccountDialogProps) {
  const { t } = useTranslation("settings");
  const [password, setPassword] = useState("");

  // Every close (Cancel, backdrop, Escape) routes through this same onOpenChange, so clearing here
  // covers them all - no separate effect needed to react to `open` turning false.
  const handleOpenChange = (next: boolean) => {
    if (!next) setPassword("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.delete.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("profile.delete.dialogDescription")}</DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{t("profile.delete.cancel")}</DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={!password || deleting}
            onClick={() => onConfirm(password)}
          >
            {t("profile.delete.confirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
