// SPDX-License-Identifier: AGPL-3.0-or-later
import { User, adminAPI, errorMessage } from "@pyxie/api-client";
import { FormDialog, Input, Label, toast, useFormValues } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface UserEditDialogProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: User) => void;
}

export default function UserEditDialog({ user, onOpenChange, onSaved }: UserEditDialogProps) {
  const { t } = useTranslation(["users", "common"]);
  const { values, setField } = useFormValues(user, (source) => ({ username: source.username, email: source.email }), {
    username: "",
    email: "",
  });

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const updated = await adminAPI.updateUser(user.id, values);
      toast.success(t("editDialog.savedToast"));
      onSaved(updated);
    } catch (err) {
      toast.error(errorMessage(err, t("editDialog.error")));
    }
  };

  return (
    <FormDialog
      open={user !== null}
      onOpenChange={onOpenChange}
      title={t("editDialog.title")}
      description={t("editDialog.description")}
      cancelLabel={t("common:cancel")}
      submitLabel={t("common:save")}
      submittingLabel={t("common:saving")}
      onSubmit={handleSubmit}
    >
      <div>
        <Label className="mb-2" htmlFor="edit-username">
          {t("editDialog.usernameLabel")}
        </Label>
        <Input
          id="edit-username"
          value={values.username}
          onChange={(e) => setField("username", e.target.value)}
          required
        />
      </div>
      <div>
        <Label className="mb-2" htmlFor="edit-email">
          {t("editDialog.emailLabel")}
        </Label>
        <Input
          id="edit-email"
          type="email"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </div>
    </FormDialog>
  );
}
