// SPDX-License-Identifier: AGPL-3.0-or-later
import { userAPI, User } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

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
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await userAPI.createUser({ ...form, password: SEED_PASSWORD });
      const created: User = await res.json();
      onCreated(created);
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, t("createDialog.error")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            {t("createDialog.trigger")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>{t("createDialog.description", { seedPassword: SEED_PASSWORD })}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="create-username">
              {t("createDialog.usernameLabel")}
            </Label>
            <Input
              id="create-username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("common:cancel")}</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common:creating") : t("common:create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
