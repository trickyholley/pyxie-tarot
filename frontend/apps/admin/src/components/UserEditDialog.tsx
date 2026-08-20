// SPDX-License-Identifier: AGPL-3.0-or-later
import { User, adminAPI, errorMessage } from "@pyxie/api-client";
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
  toast,
} from "@pyxie/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface UserEditDialogProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: User) => void;
}

export default function UserEditDialog({ user, onOpenChange, onSaved }: UserEditDialogProps) {
  const { t } = useTranslation(["users", "common"]);
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  // Seeds the fields from a newly-selected user during render (not an effect) - `user` going back to
  // null while the dialog closes must NOT clear them, so the close animation still shows real values.
  // prevUser tracks every change (including to/from null), not just truthy ones, so that reopening the
  // same user after a Cancel still re-syncs instead of leaving the discarded edits in place.
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }

  const handleSubmit = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updated = await adminAPI.updateUser(user.id, { username, email });
      toast.success(t("editDialog.savedToast"));
      onSaved(updated);
    } catch (err) {
      toast.error(errorMessage(err, t("editDialog.error")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
          <DialogDescription>{t("editDialog.description")}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="edit-username">
              {t("editDialog.usernameLabel")}
            </Label>
            <Input id="edit-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <Label className="mb-2" htmlFor="edit-email">
              {t("editDialog.emailLabel")}
            </Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("common:cancel")}</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? t("common:saving") : t("common:save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
