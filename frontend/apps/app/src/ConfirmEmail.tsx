// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ConfirmEmailForm } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { t } = useTranslation("auth");

  const handleSubmit = async () => {
    await authAPI.confirmEmailConfirmation({ token });
  };

  return (
    <ConfirmEmailForm mode="confirm" onSubmit={handleSubmit} strings={t("confirmEmail", { returnObjects: true })} />
  );
}
