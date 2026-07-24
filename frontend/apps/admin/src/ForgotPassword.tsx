import { authAPI } from "@pyxie/api-client";
import { ResetPasswordForm } from "@pyxie/ui";
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const handleSubmit = async (email: string) => {
    await authAPI.requestPasswordReset({ email, client: "admin" });
  };

  return <ResetPasswordForm mode="request" onSubmit={handleSubmit} logoSrc={logo} logoAlt="Pyxie Tarot" />;
}
