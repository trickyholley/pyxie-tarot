// SPDX-License-Identifier: AGPL-3.0-or-later
import { authAPI } from "@pyxie/api-client";
import { ConfirmEmailForm } from "@pyxie/ui";
import { useSearchParams } from "react-router-dom";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async () => {
    await authAPI.confirmEmailConfirmation({ token });
  };

  return <ConfirmEmailForm mode="confirm" onSubmit={handleSubmit} />;
}
