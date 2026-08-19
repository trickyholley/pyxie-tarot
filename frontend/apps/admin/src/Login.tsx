// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI, userAPI } from "@pyxie/api-client";
import { ApiError, ClientType } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import { AuthForm, InsufficientRoleError, SignupBotDefense } from "@pyxie/ui";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AdminRoute } from "@/lib/routes.ts";

type AuthMode = "login" | "signup";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const [mode, setMode] = useState<AuthMode>("login");
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    try {
      const { access_token, user } = await authAPI.login({ username, password, client: ClientType.ADMIN });
      login(access_token, user);
      navigate(AdminRoute.Users, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setShowPendingDialog(true);
        throw new InsufficientRoleError();
      }
      throw err; // 401, network errors, etc. — AuthForm shows inline error
    }
  };

  const handleSignup = async (username: string, password: string, email?: string, botDefense?: SignupBotDefense) => {
    // AuthForm's shared onSubmit signature makes email optional, but signup mode always requires it.
    if (!email) return;
    await userAPI.createUser({ username, password, email, client: ClientType.ADMIN, ...botDefense });
    setShowPendingDialog(true);
  };

  const handleSubmit = mode === "login" ? handleLogin : handleSignup;

  const handleDialogClose = () => {
    setShowPendingDialog(false);
    setMode("login");
  };

  return (
    <>
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        onModeChange={setMode}
        onForgotPassword={() => navigate(AdminRoute.ForgotPassword)}
        strings={{
          login: t("login", { returnObjects: true }),
          signup: t("signup", { returnObjects: true }),
          shared: t("shared", { returnObjects: true }),
        }}
      />

      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pendingApproval.title")}</DialogTitle>
            <DialogDescription>{t("pendingApproval.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleDialogClose}>{t("pendingApproval.gotIt")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
