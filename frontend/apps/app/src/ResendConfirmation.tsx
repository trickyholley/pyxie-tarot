import { authAPI } from "@pyxie/api-client";
import { ConfirmEmailForm } from "@pyxie/ui";
import logo from "@/assets/logo.png";

export default function ResendConfirmation() {
  const handleSubmit = async (email: string) => {
    await authAPI.requestEmailConfirmation({ email });
  };

  return <ConfirmEmailForm mode="resend" onSubmit={handleSubmit} logoSrc={logo} logoAlt="Pyxie Tarot" />;
}
