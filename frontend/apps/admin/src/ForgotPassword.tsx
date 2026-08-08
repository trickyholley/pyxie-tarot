// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const handleSubmit = async (email: string) => {
    await authAPI.requestPasswordReset({ email, client: "admin" });
  };

  return (
    <ResetPasswordForm
      mode="request"
      onSubmit={handleSubmit}
      onBack={() => navigate("/login")}
      strings={t("resetPassword", { returnObjects: true })}
    />
  );
}
