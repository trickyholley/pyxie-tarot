import { authAPI } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import { useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async (newPassword: string) => {
    await authAPI.confirmPasswordReset({ token, new_password: newPassword });
  };

  return <ResetPasswordForm mode="confirm" onSubmit={handleSubmit} logoSrc={logo} logoAlt="Pyxie Tarot" />;
}
