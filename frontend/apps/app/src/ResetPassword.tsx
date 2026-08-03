// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async (newPassword: string) => {
    await authAPI.confirmPasswordReset({ token, new_password: newPassword });
  };

  return <ResetPasswordForm mode="confirm" onSubmit={handleSubmit} onBack={() => navigate("/login")} />;
}
