import { authAPI } from "@pyxie/api-client";
import { ConfirmEmailForm } from "@pyxie/ui";

export default function ResendConfirmation() {
  const handleSubmit = async (email: string) => {
    await authAPI.requestEmailConfirmation({ email });
  };

  return <ConfirmEmailForm mode="resend" onSubmit={handleSubmit} />;
}
