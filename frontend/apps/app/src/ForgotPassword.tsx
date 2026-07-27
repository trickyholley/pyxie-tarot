// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const handleSubmit = async (email: string) => {
    await authAPI.requestPasswordReset({ email, client: "app" });
  };

  return <ResetPasswordForm mode="request" onSubmit={handleSubmit} onBack={() => navigate("/login")} />;
}
