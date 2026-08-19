// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI, ClientType } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AdminRoute } from "@/lib/routes.ts";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const handleSubmit = async (email: string) => {
    await authAPI.requestPasswordReset({ email, client: ClientType.ADMIN });
  };

  return (
    <ResetPasswordForm
      mode="request"
      onSubmit={handleSubmit}
      onBack={() => navigate(AdminRoute.Login)}
      strings={t("resetPassword", { returnObjects: true })}
    />
  );
}
