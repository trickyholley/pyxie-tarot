// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI, errorMessage } from "@pyxie/api-client";
import { deleteMe, updateMyEmail, updateMyPassword } from "@pyxie/api-client/src/api/users.ts";
import { useAuth, useLoading } from "@pyxie/providers";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardTitle,
  Input,
  Label,
  useTransientFlag,
} from "@pyxie/ui";
import { InfoIcon, Lock, Mail, OctagonXIcon, Send, Trash2, User } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import DeleteAccountDialog from "@/components/DeleteAccountDialog.tsx";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";

export default function Profile() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  useHeader({ title: t("profile.title"), backTo: AppRoute.Settings, icon: User });
  const { user, logout, updateUser } = useAuth();
  const { withLoading } = useLoading();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaved, flagEmailSaved] = useTransientFlag();
  const [resending, setResending] = useState(false);
  const [resent, flagResent] = useTransientFlag();
  const [resendError, setResendError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, flagPasswordSaved] = useTransientFlag();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailError(null);
    try {
      const updated = await withLoading(updateMyEmail(email));
      updateUser(updated);
      flagEmailSaved();
    } catch (err) {
      setEmailError(errorMessage(err, t("profile.email.error")));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    setResendError(null);
    try {
      await withLoading(authAPI.requestEmailConfirmation({ email: user.email }));
      flagResent();
    } catch (err) {
      setResendError(errorMessage(err, t("profile.email.resendError")));
    } finally {
      setResending(false);
    }
  };

  const handlePasswordSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.password.mismatch"));
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await withLoading(updateMyPassword(currentPassword, newPassword));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flagPasswordSaved();
    } catch (err) {
      setPasswordError(errorMessage(err, t("profile.password.error")));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDelete = async (password: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await withLoading(deleteMe(password));
      logout();
      navigate(AppRoute.Login);
    } catch (err) {
      setDeleteError(errorMessage(err, t("profile.delete.error")));
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
            {emailError && (
              <Alert variant="destructive">
                <OctagonXIcon />
                <AlertDescription>{emailError}</AlertDescription>
              </Alert>
            )}
            {user && !user.is_verified && (
              <Alert>
                <InfoIcon />
                <AlertDescription className="flex flex-col gap-2">
                  {t("profile.email.unverified")}
                  <Button
                    type="button"
                    variant="outline"
                    status={resending ? "pending" : resent ? "success" : "idle"}
                    successLabel={t("profile.email.resent")}
                    onClick={handleResend}
                  >
                    <Send data-icon="inline-start" />
                    {t("profile.email.resend")}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {resendError && (
              <Alert variant="destructive">
                <OctagonXIcon />
                <AlertDescription>{resendError}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              status={savingEmail ? "pending" : emailSaved ? "success" : "idle"}
              successLabel={tc("success")}
              disabled={email === user?.email}
            >
              <Mail data-icon="inline-start" />
              {t("profile.email.save")}
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
            {passwordError && (
              <Alert variant="destructive">
                <OctagonXIcon />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              status={savingPassword ? "pending" : passwordSaved ? "success" : "idle"}
              successLabel={tc("success")}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              <Lock data-icon="inline-start" />
              {t("profile.password.save")}
            </Button>
          </form>

          <hr />

          <div className="flex flex-col gap-3">
            <CardTitle>{t("profile.delete.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("profile.delete.description")}</p>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 data-icon="inline-start" />
              {t("profile.delete.button")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={deleteOpen}
        deleting={deleting}
        error={deleteError}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
