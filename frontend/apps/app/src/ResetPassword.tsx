// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { t } = useTranslation("auth");

  const handleSubmit = async (newPassword: string) => {
    await authAPI.confirmPasswordReset({ token, new_password: newPassword });
  };

  return (
    <ResetPasswordForm
      mode="confirm"
      onSubmit={handleSubmit}
      onBack={() => navigate(AppRoute.Login)}
      strings={t("resetPassword", { returnObjects: true })}
    />
  );
}
