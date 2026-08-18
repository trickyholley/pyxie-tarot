// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage } from "@pyxie/api-client";
import { deleteMe, updateMyEmail, updateMyPassword } from "@pyxie/api-client/src/api/users.ts";
import { useAuth, useLoading } from "@pyxie/providers";
import { Button, Card, CardContent, CardTitle, Input, Label, toast } from "@pyxie/ui";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeleteAccountDialog from "@/components/DeleteAccountDialog.tsx";
import { useHeader } from "@/lib/header.tsx";
import { clearOfflineDataCache } from "@/lib/offlineCache.ts";

export default function Profile() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("profile.title"), backTo: "/settings" });
  const { user, logout, updateUser } = useAuth();
  const { withLoading } = useLoading();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEmailSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const updated = await withLoading(updateMyEmail(email));
      updateUser(updated);
      toast.success(t("profile.email.savedToast"));
    } catch (err) {
      toast.error(errorMessage(err, t("profile.email.error")));
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.password.mismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      await withLoading(updateMyPassword(currentPassword, newPassword));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("profile.password.savedToast"));
    } catch (err) {
      toast.error(errorMessage(err, t("profile.password.error")));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async (password: string) => {
    setDeleting(true);
    try {
      await withLoading(deleteMe(password));
      logout();
      void clearOfflineDataCache();
      navigate("/login");
    } catch (err) {
      toast.error(errorMessage(err, t("profile.delete.error")));
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">
          <form className="flex flex-col gap-4" onSubmit={handleEmailSubmit}>
            <div>
              <Label className="mb-2" htmlFor="profile-email">
                {t("profile.email.label")}
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={savingEmail || email === user?.email}>
              {savingEmail ? t("profile.saving") : t("profile.save")}
            </Button>
          </form>

          <hr />

          <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
            <CardTitle>{t("profile.password.title")}</CardTitle>
            <div>
              <Label className="mb-2" htmlFor="profile-current-password">
                {t("profile.password.currentLabel")}
              </Label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="mb-2" htmlFor="profile-new-password">
                {t("profile.password.newLabel")}
              </Label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <Label className="mb-2" htmlFor="profile-confirm-password">
                {t("profile.password.confirmLabel")}
              </Label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>
              {savingPassword ? t("profile.saving") : t("profile.save")}
            </Button>
          </form>

          <hr />

          <div className="flex flex-col gap-3">
            <CardTitle>{t("profile.delete.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("profile.delete.description")}</p>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              {t("profile.delete.button")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={deleteOpen}
        deleting={deleting}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
