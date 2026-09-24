// SPDX-License-Identifier: AGPL-3.0-or-later
import { User, errorMessage, userAPI } from "@pyxie/api-client";
import { Button, DialogTrigger, FormDialog, Input, Label, toast } from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CreateUserDialogProps {
  onCreated: (user: User) => void;
}

const EMPTY_FORM = { username: "", email: "" };

// No password reset flow for admin-created accounts yet - reuse the seeded dev users' password.
const SEED_PASSWORD = "pyxie-tarot";

export default function CreateUserDialog({ onCreated }: CreateUserDialogProps) {
  const { t } = useTranslation(["users", "common"]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    try {
      const res = await userAPI.createUser({ ...form, password: SEED_PASSWORD });
      const created: User = await res.json();
      onCreated(created);
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t("createDialog.error")));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <DialogTrigger
          render={
            <Button>
              <Plus />
              {t("createDialog.trigger")}
            </Button>
          }
        />
      }
      title={t("createDialog.title")}
      description={t("createDialog.description", { seedPassword: SEED_PASSWORD })}
      cancelLabel={t("common:cancel")}
      submitLabel={t("common:create")}
      submittingLabel={t("common:creating")}
      onSubmit={handleSubmit}
    >
      <div>
        <Label className="mb-2" htmlFor="create-username">
          {t("createDialog.usernameLabel")}
        </Label>
        <Input
          id="create-username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
      </div>
      <div>
        <Label className="mb-2" htmlFor="create-email">
          {t("createDialog.emailLabel")}
        </Label>
        <Input
          id="create-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
    </FormDialog>
  );
}
