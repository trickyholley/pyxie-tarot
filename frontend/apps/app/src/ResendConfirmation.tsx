// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ConfirmEmailForm } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

export default function ResendConfirmation() {
  const { t } = useTranslation("auth");

  const handleSubmit = async (email: string) => {
    await authAPI.requestEmailConfirmation({ email });
  };

  return (
    <ConfirmEmailForm mode="resend" onSubmit={handleSubmit} strings={t("confirmEmail", { returnObjects: true })} />
  );
}
